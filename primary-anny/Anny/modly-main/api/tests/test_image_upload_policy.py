import unittest

from services.image_upload_policy import validate_uploaded_image


class ImageUploadPolicyTests(unittest.TestCase):
    def test_accepts_supported_image_signatures(self):
        cases = (
            ("image/png", b"\x89PNG\r\n\x1a\ncontent"),
            ("image/jpeg", b"\xff\xd8\xffcontent"),
            ("image/webp", b"RIFFxxxxWEBPcontent"),
        )
        for mime_type, payload in cases:
            with self.subTest(mime_type=mime_type):
                self.assertEqual(validate_uploaded_image(mime_type, payload), mime_type)

    def test_normalizes_mime_parameters_and_case(self):
        self.assertEqual(
            validate_uploaded_image("IMAGE/PNG; charset=binary", b"\x89PNG\r\n\x1a\n"),
            "image/png",
        )

    def test_rejects_missing_or_unsupported_mime(self):
        for mime_type in (None, "", "image/svg+xml", "application/octet-stream"):
            with self.subTest(mime_type=mime_type):
                with self.assertRaises(ValueError):
                    validate_uploaded_image(mime_type, b"payload")

    def test_rejects_empty_payload(self):
        with self.assertRaisesRegex(ValueError, "empty"):
            validate_uploaded_image("image/png", b"")

    def test_rejects_mime_signature_mismatch(self):
        with self.assertRaisesRegex(ValueError, "does not match"):
            validate_uploaded_image("image/png", b"not-a-png")

    def test_rejects_oversized_payload_before_generation(self):
        with self.assertRaisesRegex(ValueError, "4 bytes or smaller"):
            validate_uploaded_image("image/png", b"\x89PNG\r\n\x1a\n", max_bytes=4)


if __name__ == "__main__":
    unittest.main()
