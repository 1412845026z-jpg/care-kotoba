#!/usr/bin/env python3
"""One-time, CPU-only sample generation. Never calls a hosted inference API.

Downloads are explicit in `prepare`. Kokoro synthesis rejects every socket;
VOICEVOX is a pinned local process and the client only accepts loopback HTTP.
Models/engines live in a temporary cache, never in the app or output artifact.
"""
import argparse
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import platform
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.parse
import urllib.request
import wave
import zipfile
from array import array

HF_REV = '8542409da2986c0ab5d41b3cf0411f7a58caab38'
VV_REV = '7ebc23342bd812f5a72816330f62f110ccca8bdc'
RESOURCE_REV = '37c265375e05313486ebf2024b1679d6952a53d8'
VV_PART = 'voicevox_engine-linux-cpu-x64-0.26.0.7z.001'
VV_PARTS = 'voicevox_engine-linux-cpu-x64-0.26.0.7z.txt'
VV_URL = 'https://github.com/VOICEVOX/voicevox_engine/releases/download/0.26.0/'
VOICES = [
    {'id': 'kokoro-jf_alpha', 'engine': 'kokoro', 'voice': 'jf_alpha', 'credit': 'Kokoro-82M / hexgrad (Apache-2.0)'},
    {'id': 'kokoro-jm_kumo', 'engine': 'kokoro', 'voice': 'jm_kumo', 'credit': 'Kokoro-82M / hexgrad (Apache-2.0); upstream voice training source: koniwa tnc__kumonoito (CC BY reference in VOICES.md)'},
    {'id': 'voicevox-kigashima', 'engine': 'voicevox', 'name': '麒ヶ島宗麟', 'credit': 'VOICEVOX:麒ヶ島宗麟'},
    {'id': 'voicevox-wakamatsu', 'engine': 'voicevox', 'name': '雀松朱司', 'credit': 'VOICEVOX:雀松朱司'},
    {'id': 'voicevox-kurono', 'engine': 'voicevox', 'name': '玄野武宏', 'credit': 'VOICEVOX:玄野武宏'},
]


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def download(url, path, expected=None, prefix=None, max_bytes=2_000_000_000):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.partial')
    request = urllib.request.Request(url, headers={'User-Agent': 'Care-Kotoba-AUDIO-SAMPLES-001/1'})
    with urllib.request.urlopen(request, timeout=90) as response, tmp.open('wb') as target:
        size = 0
        while chunk := response.read(1024 * 1024):
            size += len(chunk)
            if size > max_bytes:
                raise RuntimeError(f'Download exceeds limit: {path.name}')
            target.write(chunk)
    digest = sha256(tmp)
    if expected and digest != expected:
        raise RuntimeError(f'Checksum mismatch: {path.name} {digest}')
    if prefix and not digest.startswith(prefix):
        raise RuntimeError(f'Upstream voice checksum prefix mismatch: {path.name} {digest}')
    tmp.replace(path)
    return {'url': url, 'file': str(path.name), 'bytes': size, 'sha256': digest}


def prepare(cache, out):
    entries = []
    hf = f'https://huggingface.co/hexgrad/Kokoro-82M/resolve/{HF_REV}/'
    entries.append(download(hf + 'kokoro-v1_0.pth', cache / 'kokoro/kokoro-v1_0.pth',
                            expected='496dba118d1a58f5f3db2efc88dbdc216e0483fc89fe6e47ee1f2c53f18ad1e4'))
    for name in ['config.json', 'README.md', 'VOICES.md']:
        dest = cache / 'kokoro' / name if name == 'config.json' else out / 'licenses/kokoro' / name
        entries.append(download(hf + name, dest, max_bytes=100_000))
    for voice, prefix in [('jf_alpha', '1bf4c9dc'), ('jm_kumo', '98340afd')]:
        entries.append(download(hf + f'voices/{voice}.pt', cache / f'kokoro/{voice}.pt', prefix=prefix, max_bytes=2_000_000))
    for repo, rev, names in [
        ('hexgrad/kokoro', 'dfb907a02bba8152ca444717ca5d78747ccb4bec', ['LICENSE']),
        ('hexgrad/misaki', 'fba1236595f2d2bf21d414ba6e57d25256afada3', ['LICENSE']),
        ('VOICEVOX/voicevox_engine', VV_REV, ['LICENSE', 'LGPL_LICENSE']),
        ('VOICEVOX/voicevox_resource', RESOURCE_REV, ['engine/README.md', 'engine/engine_manifest_assets/terms_of_service.md']),
    ]:
        for name in names:
            dest = out / 'licenses' / repo.split('/')[1] / name.replace('/', '_')
            entries.append(download(f'https://raw.githubusercontent.com/{repo}/{rev}/{name}', dest, max_bytes=500_000))
    # Pin and verify the complete part-list, then require exactly the known part.
    entries.append(download(VV_URL + VV_PARTS, cache / VV_PARTS,
                            expected='fb4deae84b10bf0c7ea8f02c9e78c6415e810f836ed7128977318c8cc48ea1d2', max_bytes=10_000))
    part_lines = [x.strip() for x in (cache / VV_PARTS).read_text().splitlines() if x.strip()]
    if part_lines != [VV_PART]:
        raise RuntimeError(f'Unexpected VOICEVOX split manifest; review all part hashes: {part_lines!r}')
    entries.append(download(VV_URL + VV_PART, cache / VV_PART,
                            expected='3a74cf1bdef6b415f2acf7501f50b43e8d1ebcff85b923f693a7c4a60734d943'))
    sevenzip = shutil.which('7z') or shutil.which('7zz')
    if not sevenzip:
        raise RuntimeError('This runner must have 7z/7zz preinstalled; do not silently change the engine package.')
    extract = cache / 'voicevox'
    extract.mkdir(exist_ok=True)
    # Trusted, digest-verified official package. No engine binaries are retained in output.
    subprocess.run([sevenzip, 'x', '-y', f'-o{extract}', str(cache / VV_PART)], check=True, stdout=subprocess.DEVNULL)
    candidates = [p for p in extract.rglob('run') if p.is_file()]
    if len(candidates) != 1:
        raise RuntimeError(f'Expected one engine run binary, found {len(candidates)}')
    candidates[0].chmod(candidates[0].stat().st_mode | 0o100)
    write_json(cache / 'engine-path.json', {'binary': str(candidates[0].resolve())})
    # The verified engine remains extracted; its large duplicate archive is no
    # longer needed on a standard free runner. Its full digest is in entries.
    (cache / VV_PART).unlink()
    # Pin dictionary data to its named 3.1.0 release, never the downloader's `latest` alias.
    import unidic
    dictionary = cache / 'unidic-3.1.0.zip'
    entries.append(download('https://cotonoha-dic.s3-ap-northeast-1.amazonaws.com/unidic-3.1.0.zip', dictionary, max_bytes=1_000_000_000))
    unpack = cache / 'unidic-unpack'
    unpack.mkdir(exist_ok=True)
    with zipfile.ZipFile(dictionary) as archive:
        for member in archive.infolist():
            destination = (unpack / member.filename).resolve()
            if not destination.is_relative_to(unpack.resolve()):
                raise RuntimeError('Unsafe dictionary archive member')
        archive.extractall(unpack)
    dict_sources = [p.parent for p in unpack.rglob('sys.dic')]
    if len(dict_sources) != 1:
        raise RuntimeError('Expected one UniDic dictionary')
    shutil.copytree(dict_sources[0], unidic.DICDIR, dirs_exist_ok=True)
    (Path(unidic.DICDIR) / 'mecabrc').write_text('# Temporary AUDIO-SAMPLES-001 dictionary config\n')
    (Path(unidic.DICDIR) / 'version').write_text('unidic-3.1.0+2021-08-31')
    # The dictionary license can be in an ancestor of sys.dic. Search the whole
    # extracted package and preserve relative paths instead of flattening names.
    dictionary_licenses = []
    for p in sorted(unpack.rglob('*')):
        if p.is_file() and any(x in p.name.upper() for x in ['LICENSE', 'COPYING', 'COPYRIGHT', 'AUTHORS', 'NOTICE']):
            target = out / 'licenses/unidic' / p.relative_to(unpack)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(p, target)
            if p.stat().st_size and any(x in p.name.upper() for x in ['LICENSE', 'COPYING', 'COPYRIGHT']):
                dictionary_licenses.append(str(p.relative_to(unpack)))
    if not dictionary_licenses:
        raise RuntimeError('UniDic archive contains no nonempty license/copyright file; review before generating audio')
    # Retain the installed venv dictionary and copied legal files, not duplicate
    # downloaded/extracted data. The named release and ZIP digest remain logged.
    dictionary.unlink()
    shutil.rmtree(unpack)
    write_json(out / 'downloads.json', {'kokoroRevision': HF_REV, 'voicevoxRevision': VV_REV, 'resourceRevision': RESOURCE_REV,
                                      'voicevoxPartManifest': part_lines, 'unidicLicenseFiles': dictionary_licenses, 'files': entries})


def clean_env():
    return {k: v for k, v in os.environ.items()
            if not k.startswith(('OPENAI_', 'CK_', 'HF_TOKEN', 'HUGGING_FACE_HUB_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN'))}


def wav_info(path):
    with wave.open(str(path), 'rb') as wav:
        if wav.getsampwidth() != 2:
            raise RuntimeError('Expected PCM16 WAV')
        samples = array('h', wav.readframes(wav.getnframes()))
        if sys.byteorder != 'little':
            samples.byteswap()
        if not samples or max(abs(x) for x in samples) < 3:
            raise RuntimeError('Generated WAV is silent')
        return {'sampleRate': wav.getframerate(), 'channels': wav.getnchannels(),
                'frames': wav.getnframes(), 'durationSeconds': round(wav.getnframes() / wav.getframerate(), 4),
                'pcmPeak': round(max(abs(x) for x in samples) / 32768, 6),
                'clippedSampleFraction': sum(abs(x) >= 32767 for x in samples) / len(samples)}


def encode(raw, dest):
    info = wav_info(raw)
    if info['sampleRate'] != 24000 or info['channels'] != 1 or not 0.3 < info['durationSeconds'] < 30:
        raise RuntimeError(f'Unexpected generated WAV: {raw.name}: {info}')
    dest.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', str(raw),
                    '-map_metadata', '-1', '-ar', '24000', '-ac', '1', '-codec:a', 'libmp3lame', '-b:a', '64k', str(dest)], check=True)
    return {**info, 'file': str(dest.name), 'bytes': dest.stat().st_size, 'sha256': sha256(dest)}


def block_internet():
    def denied(*args, **kwargs):
        raise RuntimeError('AUDIO-SAMPLES-001: socket access is forbidden during Kokoro local inference')
    socket.socket.connect = denied
    socket.socket.connect_ex = denied
    socket.create_connection = denied
    socket.getaddrinfo = denied


def generate_kokoro(cache, out):
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1', DO_NOT_TRACK='1', CUDA_VISIBLE_DEVICES='')
    block_internet()
    import numpy as np
    import soundfile as sf
    import torch
    from kokoro import KModel, KPipeline
    torch.set_num_threads(2)
    torch.manual_seed(0)
    model = KModel(repo_id='hexgrad/Kokoro-82M', config=str(cache / 'kokoro/config.json'),
                   model=str(cache / 'kokoro/kokoro-v1_0.pth')).to('cpu').eval()
    pipeline = KPipeline(lang_code='j', repo_id='hexgrad/Kokoro-82M', model=model, device='cpu')
    source = json.loads((out / 'sentences.json').read_text())
    records = []
    for voice in [v for v in VOICES if v['engine'] == 'kokoro']:
        for sentence in source['sentences']:
            parts = list(pipeline(sentence['text'], voice=str(cache / f"kokoro/{voice['voice']}.pt"), speed=0.9))
            if not parts or any(p.audio is None for p in parts):
                raise RuntimeError('Kokoro returned no audio')
            audio = np.concatenate([p.audio.cpu().numpy() for p in parts])
            if not np.isfinite(audio).all() or np.max(np.abs(audio)) < 0.0001:
                raise RuntimeError('Kokoro returned silent or non-finite audio')
            raw = cache / f"{sentence['id']}-{voice['id']}.wav"
            sf.write(raw, audio, 24000, subtype='PCM_16')
            encoded = encode(raw, out / 'audio' / f"{sentence['id']}-{voice['id']}.mp3")
            records.append({**sentence, **voice, **encoded, 'speed': 0.9, 'phonemes': [p.phonemes for p in parts],
                            'peak': round(float(np.max(np.abs(audio))), 6)})
            print(f"generated {sentence['id']}-{voice['id']}", flush=True)
    write_json(out / 'kokoro-results.json', {'cpuOnly': True, 'networkPolicy': 'All Python socket connections rejected during inference',
        'g2p': 'misaki ja.JAG2P default cutlet; full installed UniDic', 'packages': {name: importlib.metadata.version(name) for name in ['kokoro', 'misaki', 'torch', 'transformers', 'unidic']}, 'records': records})


def generate_voicevox(cache, out):
    binary = Path(json.loads((cache / 'engine-path.json').read_text())['binary'])
    env = clean_env()
    env.update(VV_USE_GPU='0', VV_CPU_NUM_THREADS='2', VV_DISABLE_MUTABLE_API='1', CUDA_VISIBLE_DEVICES='',
               HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', DO_NOT_TRACK='1')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    calls = []
    def request(path, data=None, method='GET'):
        url = 'http://127.0.0.1:50021' + path
        if urllib.parse.urlsplit(url).hostname != '127.0.0.1':
            raise RuntimeError('Only local engine requests are allowed')
        payload = None if data is None else json.dumps(data, ensure_ascii=False).encode()
        req = urllib.request.Request(url, data=payload, method=method, headers={'Content-Type': 'application/json'})
        with opener.open(req, timeout=180) as response:
            body = response.read()
        calls.append({'method': method, 'path': path.split('?')[0], 'host': '127.0.0.1'})
        return body
    log = (out / 'voicevox-engine.log').open('w')
    proc = subprocess.Popen([str(binary), '--host', '127.0.0.1', '--port', '50021', '--cpu_num_threads', '2', '--disable_mutable_api'],
                            cwd=binary.parent, env=env, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
    try:
        deadline = time.monotonic() + 180
        while True:
            if proc.poll() is not None:
                raise RuntimeError(f'VOICEVOX exited early: {proc.returncode}; see voicevox-engine.log')
            try:
                version = json.loads(request('/version'))
                break
            except (OSError, TimeoutError):
                if time.monotonic() > deadline:
                    raise RuntimeError('VOICEVOX startup timed out')
                time.sleep(1)
        if version != '0.26.0':
            raise RuntimeError(f'Wrong engine version: {version!r}')
        speakers = json.loads(request('/speakers'))
        manifest = json.loads(request('/engine_manifest'))
        write_json(out / 'voicevox-engine-manifest.json', manifest)
        records = []
        for voice in [v for v in VOICES if v['engine'] == 'voicevox']:
            selected = [s for s in speakers if s['name'] == voice['name']]
            if len(selected) != 1:
                raise RuntimeError(f"Missing or ambiguous speaker: {voice['name']}")
            speaker = selected[0]
            normal = [s for s in speaker['styles'] if s['name'] == 'ノーマル' and s.get('type', 'talk') == 'talk']
            if len(normal) != 1:
                raise RuntimeError(f"Missing normal talk style: {voice['name']}")
            style = normal[0]['id']
            info = json.loads(request('/speaker_info?' + urllib.parse.urlencode({'speaker_uuid': speaker['speaker_uuid']})))
            policy = info.get('policy')
            if not isinstance(policy, str) or not policy.strip():
                raise RuntimeError(f"Missing per-speaker policy: {voice['name']}")
            (out / 'licenses' / f"{voice['id']}-policy.md").write_text(policy, encoding='utf-8')
            write_json(out / f"{voice['id']}-metadata.json", {'speaker': speaker, 'policySha256': hashlib.sha256(policy.encode()).hexdigest()})
            for sentence in json.loads((out / 'sentences.json').read_text())['sentences']:
                query_path = '/audio_query?' + urllib.parse.urlencode({'speaker': style, 'text': sentence['text']})
                query = json.loads(request(query_path, method='POST'))
                query.update(speedScale=0.9, pitchScale=0.0, intonationScale=1.0, volumeScale=1.0,
                             prePhonemeLength=0.1, postPhonemeLength=0.1, outputSamplingRate=24000, outputStereo=False)
                raw = cache / f"{sentence['id']}-{voice['id']}.wav"
                raw.write_bytes(request(f'/synthesis?speaker={style}&enable_interrogative_upspeak=true', query, 'POST'))
                write_json(out / 'queries' / f"{sentence['id']}-{voice['id']}.json", query)
                records.append({**sentence, **voice, **encode(raw, out / 'audio' / f"{sentence['id']}-{voice['id']}.mp3"),
                                'speakerUuid': speaker['speaker_uuid'], 'styleId': style, 'styleName': 'ノーマル', 'speedScale': 0.9})
                print(f"generated {sentence['id']}-{voice['id']}", flush=True)
        write_json(out / 'voicevox-results.json', {'engineVersion': version, 'cpuOnly': True, 'clientRequests': calls, 'records': records})
    finally:
        if proc.poll() is None:
            os.killpg(proc.pid, signal.SIGTERM)
            try:
                proc.wait(timeout=15)
            except subprocess.TimeoutExpired:
                os.killpg(proc.pid, signal.SIGKILL)
                proc.wait(timeout=10)
        log.close()


def comparisons(cache, out):
    files = []
    for sentence in json.loads((out / 'sentences.json').read_text())['sentences']:
        dest = out / 'audio' / f"{sentence['id']}-comparison.mp3"
        args = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y']
        for voice in VOICES:
            args.extend(['-i', str(cache / f"{sentence['id']}-{voice['id']}.wav")])
        filters = []
        for i in range(len(VOICES)):
            filters.append(f'[{i}:a]apad=pad_dur=0.7[a{i}]')
        filters.append(''.join(f'[a{i}]' for i in range(len(VOICES))) + f'concat=n={len(VOICES)}:v=0:a=1[out]')
        args.extend(['-filter_complex', ';'.join(filters), '-map', '[out]', '-map_metadata', '-1', '-ar', '24000', '-ac', '1',
                     '-codec:a', 'libmp3lame', '-b:a', '64k', str(dest)])
        subprocess.run(args, check=True)
        files.append({'sentenceId': sentence['id'], 'file': dest.name, 'voiceOrder': [v['id'] for v in VOICES],
                      'gapSeconds': 0.7, 'sha256': sha256(dest), 'bytes': dest.stat().st_size})
    write_json(out / 'comparisons.json', files)
    write_json(out / 'environment.json', {'python': sys.version, 'platform': platform.platform(),
        'ffmpeg': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
        'voices': VOICES, 'technicalReviewOnly': True, 'listeningCompleted': False,
        'note': 'Files generated by local CPU models. No human or model listening evaluation has been performed; waveform checks do not establish naturalness or correct Japanese prosody.'})
    package_licenses = []
    for dist in sorted(importlib.metadata.distributions(), key=lambda d: d.metadata['Name'].lower()):
        metadata = dist.metadata
        package_licenses.append({'name': metadata['Name'], 'version': dist.version,
            'licenseExpression': metadata.get('License-Expression'), 'license': metadata.get('License'),
            'licenseClassifiers': [v for v in metadata.get_all('Classifier', []) if v.startswith('License ::')]})
    write_json(out / 'isolated-tool-package-licenses.json', {
        'scope': 'Temporary synthesis venv only; no engine, model, package code, or GPL/AGPL library is incorporated into the App or committed to the repository.',
        'warning': 'Kokoro English extras can install phonemizer-fork (GPL) and eSpeak tooling. These are isolated tools, unused for the selected Japanese G2P. Voice audio licensing is separate.',
        'packages': package_licenses})
    artifacts = [{'file': str(p.relative_to(out)), 'bytes': p.stat().st_size, 'sha256': sha256(p)} for p in sorted(out.rglob('*')) if p.is_file() and p.name != 'SHA256SUMS.json']
    if len(list((out / 'audio').glob('*.mp3'))) != 30:
        raise RuntimeError('Expected 25 individual samples plus 5 sentence comparisons')
    write_json(out / 'SHA256SUMS.json', artifacts)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('phase', choices=['prepare', 'kokoro', 'voicevox', 'comparisons'])
    parser.add_argument('--cache', required=True, type=Path)
    parser.add_argument('--out', required=True, type=Path)
    args = parser.parse_args()
    for name in list(os.environ):
        if name.startswith(('OPENAI_', 'CK_', 'HF_TOKEN', 'HUGGING_FACE_HUB_TOKEN', 'GITHUB_TOKEN', 'GH_TOKEN')):
            os.environ.pop(name, None)
    args.cache = args.cache.resolve()
    args.out = args.out.resolve()
    args.cache.mkdir(parents=True, exist_ok=True)
    args.out.mkdir(parents=True, exist_ok=True)
    {'prepare': prepare, 'kokoro': generate_kokoro, 'voicevox': generate_voicevox, 'comparisons': comparisons}[args.phase](args.cache, args.out)
