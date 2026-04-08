import * as crypto from "crypto"
import * as fs from "fs/promises"

/**
 * PromptDecryptor - Handles AES-256-CBC decryption of encrypted prompt files.
 * Supports both Skills (SKILL.md) and Modes (.roomodes, custom-modes.yaml) files.
 * 
 * Encryption format:
 * - First 16 bytes: IV (Initialization Vector)
 * - Remaining bytes: Encrypted content
 * 
 * The decryption key is hard-coded for simplicity.
 * WARNING: In production environments, use environment variables or secure key management.
 */

const ALGORITHM = "aes-256-cbc"
const IV_LENGTH = 16 // AES block size
const KEY_LENGTH = 32 // 256 bits

// Hard-coded 256-bit key (32 bytes = 64 hex characters)
// This matches the key in scripts/encrypt-prompt.js
const ENCRYPTION_KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90"

export class PromptDecryptor {
	/**
	 * Get the hard-coded decryption key.
	 * @returns The hex-encoded key string
	 */
	static getKey(): string {
		return ENCRYPTION_KEY
	}

	/**
	 * Check if a file appears to be encrypted.
	 * We detect encryption by checking if the file starts with non-UTF8 content
	 * or has a specific magic byte pattern.
	 * 
	 * For simplicity, we check if the file cannot be read as valid UTF-8 text
	 * with expected frontmatter or YAML structure.
	 * 
	 * @param filePath - Path to the file
	 * @returns true if the file appears to be encrypted
	 */
	static async isEncrypted(filePath: string): Promise<boolean> {
		try {
			const buffer = await fs.readFile(filePath)
			
			// Try to read as UTF-8
			const content = buffer.toString("utf-8")
			
			// Check based on file type
			const isYamlFile = filePath.endsWith(".yaml") || filePath.endsWith(".yml") || filePath.endsWith(".roomodes")
			const isMdFile = filePath.endsWith(".md")
			
			if (isYamlFile || filePath.endsWith(".roomodes")) {
				// YAML files should start with valid YAML content
				// Encrypted files will have non-printable characters
				const printableRatio = this.getPrintableCharacterRatio(content)
				if (printableRatio < 0.85) {
					return true
				}
				
				// Check if it looks like valid YAML structure
				// Encrypted content won't have proper YAML formatting
				if (!content.includes(":") && !content.trim().startsWith("#")) {
					return true
				}
			} else if (isMdFile) {
				// Valid skill files should start with --- (frontmatter)
				if (!content.trim().startsWith("---")) {
					return true
				}
				
				// Additional check: encrypted content often has non-printable characters
				const printableRatio = this.getPrintableCharacterRatio(content)
				if (printableRatio < 0.85) {
					return true
				}
			}
			
			return false
		} catch (error) {
			// If we can't read the file, assume it's not encrypted
			// and let the caller handle the error
			return false
		}
	}

	/**
	 * Calculate the ratio of printable characters in a string.
	 * @param content - The string to analyze
	 * @returns Ratio between 0 and 1
	 */
	private static getPrintableCharacterRatio(content: string): number {
		if (content.length === 0) return 1
		
		let printableCount = 0
		for (let i = 0; i < content.length; i++) {
			const charCode = content.charCodeAt(i)
			// Printable ASCII range + common whitespace
			if (
				(charCode >= 32 && charCode <= 126) || // Printable ASCII
				charCode === 10 || // Line feed
				charCode === 13 || // Carriage return
				charCode === 9 // Tab
			) {
				printableCount++
			}
		}
		return printableCount / content.length
	}

	/**
	 * Decrypt an encrypted prompt file.
	 * 
	 * @param filePath - Path to the encrypted file
	 * @param key - Optional key override (defaults to hard-coded key)
	 * @returns Decrypted content as string
	 * @throws Error if decryption fails
	 */
	static async decrypt(filePath: string, key?: string): Promise<string> {
		const encryptionKey = key || this.getKey()
		
		// Read the encrypted file
		const encryptedBuffer = await fs.readFile(filePath)
		
		if (encryptedBuffer.length <= IV_LENGTH) {
			throw new Error("Encrypted file is too small to contain valid data")
		}
		
		// Extract IV (first 16 bytes)
		const iv = encryptedBuffer.subarray(0, IV_LENGTH)
		
		// Extract encrypted content (remaining bytes)
		const encryptedContent = encryptedBuffer.subarray(IV_LENGTH)
		
		// Create decipher
		const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(encryptionKey, "hex"), iv)
		
		// Decrypt
		let decrypted = decipher.update(encryptedContent)
		decrypted = Buffer.concat([decrypted, decipher.final()])
		
		return decrypted.toString("utf-8")
	}

	/**
	 * Read and optionally decrypt a prompt file.
	 * If the file is encrypted, it will be decrypted automatically.
	 * Supports both SKILL.md and .roomodes/custom-modes.yaml files.
	 * 
	 * @param filePath - Path to the prompt file
	 * @param encoding - File encoding (default: utf-8)
	 * @returns File content as string
	 */
	static async readPromptFile(filePath: string, encoding: BufferEncoding = "utf-8"): Promise<string> {
		// Check if file is encrypted
		const isEncrypted = await this.isEncrypted(filePath)
		
		if (isEncrypted) {
			console.log(`[PromptDecryptor] Decrypting encrypted prompt file: ${filePath}`)
			return await this.decrypt(filePath)
		}
		
		// Read normally if not encrypted
		return await fs.readFile(filePath, encoding)
	}
}
