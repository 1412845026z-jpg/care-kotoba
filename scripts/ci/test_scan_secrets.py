import io
import unittest
import zipfile
from scan_secrets import credential_path, scan_file


class SecretScanTests(unittest.TestCase):
    def test_zip_member_is_scanned_and_value_is_redacted(self):
        secret = b'sk-' + b'A' * 40
        data = io.BytesIO()
        with zipfile.ZipFile(data, 'w', zipfile.ZIP_DEFLATED) as archive:
            archive.writestr('source/config.txt', b'key=' + secret)
        issues = scan_file('archive.zip', data.getvalue())
        self.assertTrue(any('archive.zip!source/config.txt' in line for line in issues))
        self.assertTrue(all(secret.decode() not in line for line in issues))

    def test_placeholder_and_template_are_allowed(self):
        self.assertEqual(scan_file('env.example', b'OPENAI_API_KEY=your-key-here\n'), [])
        self.assertFalse(credential_path('prototype/.env.example'))
        self.assertTrue(credential_path('prototype/.env.local'))
        self.assertTrue(credential_path('prototype/.dev.vars'))

    def test_invalid_archive_fails_closed(self):
        self.assertTrue(scan_file('bad.zip', b'not a zip'))


if __name__ == '__main__':
    unittest.main()
