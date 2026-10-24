#!/usr/bin/env python3
"""Validate and build the original SSW basic-dialogue review pack, without APIs."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'content/ssw-basic'
INPUTS = ['scenes-01-32.json', 'scenes-33-64.json', 'scenes-65-96.json']
ROLES = {'worker', 'resident', 'colleague', 'nurse', 'visitor'}
TOPICS = [
    ('挨拶・入退室', '问候与进出房间'), ('聞き返し', '没听懂时再问一次'),
    ('職員の指示確認', '确认同事的指示'), ('起床・休息・就寝', '起床、休息与就寝'),
    ('衣服・身だしなみ', '穿衣与仪容'), ('食事前', '进食前的准备'),
    ('食事・飲み物', '进食与饮水沟通'), ('口腔・整容', '口腔与洗脸沟通'),
    ('排泄', '如厕与排泄沟通'), ('入浴・清潔', '入浴与清洁沟通'),
    ('移動・移乗', '移动与移乘前沟通'), ('居室・生活環境', '居室与生活环境'),
    ('活動・日中の会話', '活动与日常交流'), ('不安への返答', '回应不安与担心'),
    ('短い観察・報告', '简单观察与报告'), ('チーム連絡・支援', '团队联络与求助'),
    ('感染予防・手洗い', '洗手与感染预防沟通'), ('洗濯・リネン', '洗衣与床品沟通'),
    ('体調確認', '测量前说明与身体感受'), ('薬に関する連絡', '向护士确认药物相关事项'),
    ('予定・外出', '日程、通院与外出'), ('来客・家族', '来客与家人联络'),
    ('安全・防災', '安全报告与防灾训练'), ('身近な用具', '眼镜、助听器与呼叫铃'),
]
CJK = re.compile(r'[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]')


def dump(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_pack():
    sources_path = BASE / 'sources.json'
    source_document = json.loads(sources_path.read_text(encoding='utf-8'))
    source_ids = {s['id'] for s in source_document['sources']}
    assert len(source_ids) == len(source_document['sources']), 'Duplicate source ID'
    scenes = []
    for name in INPUTS:
        group = json.loads((BASE / name).read_text(encoding='utf-8'))
        assert isinstance(group, list) and len(group) == 32, f'{name}: expected 32 scenes'
        scenes.extend(group)
    errors = []
    expected = [f'SSW-S{i:02d}' for i in range(1, 97)]
    if [s.get('id') for s in scenes] != expected:
        errors.append('Expected unique, ordered IDs SSW-S01 through SSW-S96')
    for i, scene in enumerate(scenes, 1):
        sid = scene.get('id', f'row{i}')
        if scene.get('topic_id') != f'T{(i - 1) // 4 + 1:02d}':
            errors.append(f'{sid}: incorrect topic ID')
        for key in ['title_ja', 'title_zh', 'goal_zh', 'context_zh']:
            if not isinstance(scene.get(key), str) or not scene[key].strip():
                errors.append(f'{sid}: missing {key}')
        if scene.get('difficulty') != 'basic':
            errors.append(f'{sid}: difficulty must be basic (editorial label)')
        npc = scene.get('npc_role')
        if npc not in ROLES - {'worker'}:
            errors.append(f'{sid}: unsupported NPC role {npc!r}')
        refs = scene.get('source_topic_ids')
        if not isinstance(refs, list) or not refs or any(r not in source_ids for r in refs):
            errors.append(f'{sid}: unresolved source topic IDs {refs!r}')
        dialogue = scene.get('dialogue')
        if not isinstance(dialogue, list) or len(dialogue) != 4:
            errors.append(f'{sid}: expected exactly four dialogue turns')
            continue
        for n, turn in enumerate(dialogue):
            if turn.get('speaker') not in {'worker', npc}:
                errors.append(f'{sid}[{n}]: role does not match this scene')
            if n and turn.get('speaker') == dialogue[n - 1].get('speaker'):
                errors.append(f'{sid}[{n}]: expected alternating speakers')
            for key in ['ja', 'kana', 'zh']:
                if not isinstance(turn.get(key), str) or not turn[key].strip():
                    errors.append(f'{sid}[{n}]: missing {key}')
            if isinstance(turn.get('ja'), str) and len(turn['ja']) > 55:
                errors.append(f'{sid}[{n}]: Japanese line exceeds 55 characters ({len(turn["ja"])})')
            if CJK.search(str(turn.get('kana', ''))):
                errors.append(f'{sid}[{n}]: kana still contains kanji')
        practice = scene.get('practice', {})
        cue, response = practice.get('cue_turn'), practice.get('response_turn')
        if not isinstance(cue, int) or isinstance(cue, bool) or not isinstance(response, int) or isinstance(response, bool) or not (0 <= cue < 3 and response == cue + 1):
            errors.append(f'{sid}: practice cue/response must be adjacent valid turns')
        elif dialogue[response].get('speaker') != 'worker' or dialogue[cue].get('speaker') == 'worker':
            errors.append(f'{sid}: practice response must be a worker response to the NPC')
        alternatives = practice.get('alternatives_ja')
        if not isinstance(alternatives, list) or len(alternatives) != 2 or any(not isinstance(v, str) or not v.strip() or len(v) > 55 for v in alternatives):
            errors.append(f'{sid}: expected two nonempty short worker alternatives')
        elif len(set(alternatives)) != 2:
            errors.append(f'{sid}: duplicate alternative answers')
        if not isinstance(practice.get('check_zh'), str) or not practice['check_zh'].strip():
            errors.append(f'{sid}: missing practice check')
    if errors:
        raise ValueError('\n'.join(errors))
    counts = Counter(s['topic_id'] for s in scenes)
    assert len(counts) == 24 and set(counts.values()) == {4}, 'Expected 24 topics with four scenes each'
    paths = [BASE / name for name in INPUTS] + [sources_path, Path(__file__), BASE / 'template.html']
    hashes = {str(p.relative_to(ROOT)): digest(p.read_bytes()) for p in paths}
    topics = [{'id': f'T{i:02d}', 'title_ja': ja, 'title_zh': zh, 'scene_count': counts[f'T{i:02d}']} for i, (ja, zh) in enumerate(TOPICS, 1)]
    return scenes, topics, source_document, hashes


def build_audio_plan(scenes):
    entries = {}
    occurrences = 0
    for scene in scenes:
        uses = [(t['speaker'], t['ja'], t['kana'], {'scene_id': scene['id'], 'kind': 'dialogue', 'turn': i}) for i, t in enumerate(scene['dialogue'])]
        uses += [('worker', text, None, {'scene_id': scene['id'], 'kind': 'alternative', 'alternative': i}) for i, text in enumerate(scene['practice']['alternatives_ja'])]
        for role, text, kana, use in uses:
            occurrences += 1
            identity = json.dumps([role, text], ensure_ascii=False, separators=(',', ':'))
            aid = 'ssw-' + digest(identity.encode())[:16]
            entry = entries.setdefault(identity, {'asset_id': aid, 'role': role, 'text_ja': text,
                'kana_candidates': [], 'scene_uses': [], 'status': 'pending_voice_choice_and_text_review',
                'voice_id': None, 'mp3_file': None})
            if kana and kana not in entry['kana_candidates']:
                entry['kana_candidates'].append(kana)
            entry['scene_uses'].append(use)
    assets = []
    for entry in entries.values():
        readings = entry.pop('kana_candidates')
        entry['kana'] = readings[0] if len(readings) == 1 else None
        if not readings:
            entry['reading_review'] = 'Alternative answer has no separately authored kana; check before synthesis.'
        elif len(readings) > 1:
            entry['reading_review'] = 'Conflicting authored readings; resolve before synthesis.'
            entry['kana_candidates'] = readings
        else:
            entry['reading_review'] = 'Authored reading still awaits Japanese-educator review.'
        assets.append(entry)
    assert len({a['asset_id'] for a in assets}) == len(assets), 'Audio asset ID collision'
    return {'version': '0.1.0', 'kind': 'synthesis_plan_only', 'generated_mp3_count': 0,
        'voice_selection': 'not_selected', 'review_status': 'draft_pending_expert_review',
        'dialogue_line_occurrences': sum(len(s['dialogue']) for s in scenes),
        'alternative_line_occurrences': sum(len(s['practice']['alternatives_ja']) for s in scenes),
        'total_occurrences': occurrences, 'unique_role_text_assets': len(assets),
        'note_zh': '这是按角色和句子去重的待合成清单，不是已生成录音。原30段仍是音色样本；浏览器临时朗读也不计作MP3。',
        'assets': assets}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate that deterministic generated outputs are current')
    args = parser.parse_args()
    scenes, topics, sources, hashes = read_pack()
    audio = build_audio_plan(scenes)
    catalog = {'version': '0.1.0', 'status': 'draft_pending_expert_review', 'fictional': True,
        'audience_zh': '在日本介护现场工作的特定技能等外国介护人员；先练简单、尊重的工作沟通。',
        'difficulty_note_zh': 'basic是本项目的编辑分层，不是官方JLPT、CEFR或技能资格认定。每次只练一个沟通目标。',
        'scope_note_zh': '96个微场景是基础覆盖首版，不代表穷尽介护场景；不提供诊断、药物剂量、移乘技术或临床处置教学。实际工作遵循设施安排与负责人指示。',
        'reuse_note_zh': '参考官方免费教材核对主题与常用词；对话、读音辅助与中文说明由项目原创。没有导入教材原文、题目、音频或插图；不是官方教材。',
        'audio_note_zh': '全量音色尚未选择，新增MP3尚未生成。预览页只在用户点击后调用浏览器或系统临时朗读，可能需联网。',
        'counts': {'topics': len(topics), 'scenes': len(scenes), 'dialogue_lines': 384, 'alternative_answers': 192,
            'unique_planned_audio_assets': audio['unique_role_text_assets'], 'generated_mp3_files': 0},
        'source_files_sha256': hashes, 'topics': topics, 'source_index': sources, 'scenes': scenes}
    payload = json.dumps(catalog, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    template = (BASE / 'template.html').read_text(encoding='utf-8')
    assert template.count('__SSW_BASIC_DATA__') == 1, 'Expected exactly one template data marker'
    coverage = ['# 特定技能等外国介护人员：基础短对话覆盖表', '',
        '本表统计实际写入的原创内容；不是教材全文导入，也不代表全部介护场景已覆盖。每场景4轮、一个沟通目标；原48场景与12核心草稿保持原样。', '',
        '| 分类 | 微场景 | 本次目标 |', '| --- | --- | --- |']
    for topic in topics:
        group = [s for s in scenes if s['topic_id'] == topic['id']]
        coverage.append(f'| {topic["id"]} {topic["title_zh"]} | '+ '、'.join(s['id'] for s in group) + ' | ' + '；'.join(s['title_zh'] for s in group) + ' |')
    coverage += ['', f'合计：{len(scenes)}场景，384轮台词，192条替代回答；按角色与文字去重后{audio["unique_role_text_assets"]}条待合成资产；本次新增MP3为0。', '',
        '## 仍需补核', '',
        '- 由介护经验者核查工作真实性、本人意向与语言任务边界；由日语教育者核查自然度、读音和学员负担。',
        '- 替代回答未单独提供假名，不能把待合成清单当成已审稿的朗读稿；同句不同读音时也需先消除分歧。',
        '- 地方口语、个人习惯、失语/听力等沟通调整、家属复杂争议与非常规事件可另扩展；不为凑数量自动增加医疗处置。',
        '- 仍待最终音色选择、全量合成、真正试听与真机检查；浏览器临时朗读不等于已有录音。',
        '- 图片只在人物、地点、物品或动作能帮助理解时考虑；本批保留原创图示建议，未搬教材插图。', '']
    outputs = {'catalog.json': dump(catalog), 'audio-plan.json': dump(audio),
        'coverage.md': '\n'.join(coverage), 'index.html': template.replace('__SSW_BASIC_DATA__', payload)}
    stale = []
    for name, content in outputs.items():
        path = BASE / name
        if args.check:
            if not path.exists() or path.read_text(encoding='utf-8') != content:
                stale.append(name)
        else:
            path.write_text(content, encoding='utf-8')
    if stale:
        raise SystemExit('Stale or missing outputs: ' + ', '.join(stale) + '; run python3 tools/ssw-basic/build.py')
    print(dump({'checked' if args.check else 'built': True, 'scenes': len(scenes), 'topics': len(topics),
        'dialogue_lines': 384, 'alternative_answers': 192, 'unique_planned_audio_assets': audio['unique_role_text_assets'],
        'generated_mp3_files': 0, 'paid_api_calls': 0}).strip())


if __name__ == '__main__':
    main()
