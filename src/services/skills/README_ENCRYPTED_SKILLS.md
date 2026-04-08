# Encrypted Skills

ROO Code supports loading encrypted skill files using AES-256-CBC encryption. This allows you to protect sensitive skill content while still using it in your workflows.

## How It Works

When ROO Code reads a skill file, it automatically detects if the file is encrypted and decrypts it on-the-fly before injecting it into the LLM context.

## Encryption Format

Encrypted skill files use the following format:
- **First 16 bytes**: Initialization Vector (IV)
- **Remaining bytes**: AES-256-CBC encrypted content

## Setup

### 1. Generate a Decryption Key

Generate a 32-byte (256-bit) key in hexadecimal format:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Example output: `e85cfafbb8ed9a3de15a800c8f445d6f10681b7bd33d9b4bdf59fb623a871ff3`

### 2. Set the Environment Variable

Set the `ROO_SKILL_DECRYPT_KEY` environment variable with your key:

```bash
export ROO_SKILL_DECRYPT_KEY=e85cfafbb8ed9a3de15a800c8f445d6f10681b7bd33d9b4bdf59fb623a871ff3
```

Or add it to your shell profile (`.bashrc`, `.zshrc`, etc.) for persistence.

### 3. Encrypt Your Skill File

Use this script to encrypt a skill file:

```bash
#!/bin/bash
# encrypt-skill.sh

SKILL_FILE="$1"
KEY="${ROO_SKILL_DECRYPT_KEY}"

if [ -z "$KEY" ]; then
    echo "Error: ROO_SKILL_DECRYPT_KEY environment variable is not set"
    exit 1
fi

if [ -z "$SKILL_FILE" ]; then
    echo "Usage: $0 <skill-file.md>"
    exit 1
fi

# Generate random IV
IV=$(openssl rand -hex 16)

# Encrypt the file
openssl enc -aes-256-cbc -in "$SKILL_FILE" -out "${SKILL_FILE}.enc" -K "$KEY" -iv "$IV"

echo "Encrypted file created: ${SKILL_FILE}.enc"
```

Or use Node.js directly:

```javascript
const crypto = require('crypto');
const fs = require('fs');

const KEY = process.env.ROO_SKILL_DECRYPT_KEY; // 64 hex characters
const ALGORITHM = 'aes-256-cbc';

// Read the skill file
const content = fs.readFileSync('SKILL.md', 'utf-8');

// Generate random IV
const iv = crypto.randomBytes(16);

// Create cipher
const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);

// Encrypt
let encrypted = cipher.update(content, 'utf-8');
encrypted = Buffer.concat([encrypted, cipher.final()]);

// Combine IV + encrypted content
const encryptedBuffer = Buffer.concat([iv, encrypted]);

// Write encrypted file
fs.writeFileSync('SKILL.md.enc', encryptedBuffer);
console.log('Encrypted file created: SKILL.md.enc');
```

### 4. Place the Encrypted File

Place the encrypted file in your skills directory as usual:
```
.roo/skills/your-skill-name/SKILL.md.enc
```

Note: You can name it with any extension (`.enc`, `.encrypted`, etc.) or even keep the `.md` extension - ROO Code will automatically detect that it's encrypted.

## Detection

ROO Code automatically detects encrypted files by checking:
1. If the file doesn't start with `---` (YAML frontmatter marker)
2. If the file has a low ratio of printable characters (indicating binary/encrypted content)

No manual configuration is needed - encrypted files are decrypted automatically when read.

## Security Notes

- **Keep your key secure**: Store the `ROO_SKILL_DECRYPT_KEY` in a secure location (password manager, secure environment variable store, etc.)
- **Don't commit the key**: Never commit your decryption key to version control
- **Key management**: Consider using your system's keychain or a secrets manager for production environments
- **File permissions**: Ensure encrypted skill files have appropriate file permissions

## Troubleshooting

### Error: "ROO_SKILL_DECRYPT_KEY environment variable is not set"

Make sure you've exported the environment variable before starting VS Code:
```bash
export ROO_SKILL_DECRYPT_KEY=your-key-here
code .
```

### Error: "Invalid key length"

The key must be exactly 64 hexadecimal characters (representing 32 bytes / 256 bits). Regenerate it using:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Skill not loading

Check the VS Code developer console (Help > Toggle Developer Tools) for error messages related to skill decryption.

## Example Workflow

1. Create a skill normally in `.roo/skills/my-secret-skill/SKILL.md`
2. Encrypt it using the script above
3. Delete the original unencrypted file
4. Rename the encrypted file to `SKILL.md` (or keep `.enc` extension)
5. Set the `ROO_SKILL_DECRYPT_KEY` environment variable
6. Restart VS Code
7. The skill will now load automatically with decrypted content
