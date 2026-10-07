"""Publish only an authenticated encrypted envelope; password stays in ignored local state."""
import argparse,base64,json,os,secrets,gzip
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
ROOT=Path(__file__).resolve().parents[1]
MONITOR=ROOT/'SN/monitor' if (ROOT/'SN/monitor').exists() else ROOT/'monitor'
def encrypt(raw,password):
    salt,iv=secrets.token_bytes(16),secrets.token_bytes(12)
    key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=600000).derive(password.encode())
    b64=lambda b:base64.b64encode(b).decode()
    return dict(version=1,algorithm='AES-256-GCM',kdf='PBKDF2-SHA256',iterations=600000,compression='gzip',
                salt=b64(salt),iv=b64(iv),ciphertext=b64(AESGCM(key).encrypt(iv,gzip.compress(raw,mtime=0),None)))
def main():
    p=argparse.ArgumentParser();p.add_argument('--input',type=Path,default=ROOT/'private/dataset.json')
    p.add_argument('--output',type=Path,default=MONITOR/'data.enc.json')
    p.add_argument('--key-file',type=Path,default=ROOT/'private/解鎖密碼.txt')
    p.add_argument('--require-existing-key',action='store_true')
    a=p.parse_args();a.key_file.parent.mkdir(parents=True,exist_ok=True)
    if not a.key_file.exists():
        if a.require_existing_key:raise FileNotFoundError('缺少既有解鎖密碼；請先復原本機密碼檔')
        fd=os.open(a.key_file,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600)
        with os.fdopen(fd,'w') as f:f.write(secrets.token_urlsafe(32))
    password=a.key_file.read_text().strip()
    if len(password)<8:raise ValueError('解鎖密碼至少需 8 個字元')
    raw=a.input.read_bytes();json.loads(raw)
    a.output.write_text(json.dumps(encrypt(raw,password),indent=2))
    print('加密完成；密碼未輸出。只發布 data.enc.json，勿上傳 private 資料夾。')
if __name__=='__main__':main()
