#!/usr/bin/env python3
"""Create a private local source handoff; never expose source archives through the site."""
import fnmatch
import os
import sys
import zipfile

EXCLUDED_DIRS = {"node_modules", "dist", ".git", "__pycache__", ".cache", ".turbo", "coverage", "private-exports", ".ssh", ".aws", ".secrets", ".credentials"}
EXCLUDED_NAMES = [".env", ".env.*", "*.pem", "*.key", "*.p12", "*.pfx", "*.jks", "*.keystore", "id_rsa*", "id_ed25519*", "id_ecdsa*", "credentials.json", "service-account*.json", "*private-key*", "*api-credentials*", ".npmrc", ".pypirc", ".netrc", "*.zip", "*.tar.gz"]

def excluded(name: str) -> bool:
    return any(fnmatch.fnmatch(name.lower(), pat.lower()) for pat in EXCLUDED_NAMES)

def create_zip(source_dir: str, output_zip_path: str) -> None:
    source_dir = os.path.abspath(source_dir)
    output_zip_path = os.path.abspath(output_zip_path)
    public_dir = os.path.join(source_dir, "client", "public")
    if os.path.commonpath([output_zip_path, public_dir]) == public_dir:
        raise ValueError("Refusing to create a source archive under client/public")
    os.makedirs(os.path.dirname(output_zip_path), exist_ok=True)
    with zipfile.ZipFile(output_zip_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for root, dirs, files in os.walk(source_dir):
            dirs[:] = [d for d in dirs if d not in EXCLUDED_DIRS and not os.path.islink(os.path.join(root, d))]
            for name in files:
                full = os.path.join(root, name)
                if excluded(name) or os.path.islink(full) or os.path.abspath(full) == output_zip_path:
                    continue
                archive.write(full, os.path.relpath(full, source_dir))
    print(f"Private handoff archive saved: {output_zip_path}")

if __name__ == "__main__":
    project = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(project, "private-exports", "the-absolute-astrology.zip")
    create_zip(project, target)
