"""AWS S3 utilities for file upload and presigned URL generation."""

import logging
import os
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from fastapi import UploadFile

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET_NAME = os.environ.get("S3_BUCKET_NAME", "")


def get_s3_client():
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        return None
    return boto3.client(
        "s3",
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION,
    )


def upload_file_to_s3(file: UploadFile, object_name: str) -> str | None:
    """Upload a file to S3. Returns the S3 key if successful, or None."""
    client = get_s3_client()
    if not client or not S3_BUCKET_NAME:
        logging.error("S3 client not configured or bucket name missing.")
        return None
    try:
        client.upload_fileobj(
            file.file,
            S3_BUCKET_NAME,
            object_name,
            ExtraArgs={"ContentType": file.content_type},
        )
        return object_name
    except ClientError as e:
        logging.error(f"S3 Upload Error: {e}")
        return None
    except NoCredentialsError:
        logging.error("AWS Credentials not found.")
        return None


def _extract_s3_key(object_name: str) -> str:
    """Extract S3 key from a value that may be a full S3 URL or just a key."""
    if object_name.startswith("https://") or object_name.startswith("http://"):
        # Full URL like https://bucket.s3.region.amazonaws.com/uploads/colposcopia/file.jpg
        from urllib.parse import urlparse
        parsed = urlparse(object_name)
        # Strip leading slash from path
        return parsed.path.lstrip("/")
    return object_name


def generate_presigned_url(object_name: str, expiration: int = 3600) -> str | None:
    """Generate a presigned URL to share an S3 object."""
    client = get_s3_client()
    if not client or not S3_BUCKET_NAME:
        return None
    key = _extract_s3_key(object_name)
    try:
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": S3_BUCKET_NAME, "Key": key},
            ExpiresIn=expiration,
        )
    except ClientError as e:
        logging.error(f"S3 Presign Error: {e}")
        return None
