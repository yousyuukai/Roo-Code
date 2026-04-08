import * as crypto from "crypto"
import * as fs from "fs/promises"
import * as path from "path"
import { SkillDecryptor } from "../SkillDecryptor"

const ALGORITHM = "aes-256-cbc"
const IV_LENGTH = 16

// Hard-coded key matching the one in SkillDecryptor.ts
const HARD_CODED_KEY = "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"

describe("SkillDecryptor", () => {
	const originalEnv = process.env.ROO_SKILL_DECRYPT_KEY

	beforeEach(() => {
		// Clean up any env vars since we're using hard-coded key now
		delete process.env.ROO_SKILL_DECRYPT_KEY
	})

	afterEach(() => {
		if (originalEnv) {
			process.env.ROO_SKILL_DECRYPT_KEY = originalEnv
		} else {
			delete process.env.ROO_SKILL_DECRYPT_KEY
		}
	})

	describe("getKey", () => {
		it("should return the hard-coded key", () => {
			const key = SkillDecryptor.getKey()
			expect(key).toBe(HARD_CODED_KEY)
		})

		it("should always return the same key", () => {
			const key1 = SkillDecryptor.getKey()
			const key2 = SkillDecryptor.getKey()
			expect(key1).toBe(key2)
		})
	})

	describe("isEncrypted", () => {
		it("should return false for valid skill file with frontmatter", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.md")
			const content = `---
name: test-skill
description: A test skill
---

# Test Skill

Content here.
`
			await fs.writeFile(tempFile, content, "utf-8")
			const isEncrypted = await SkillDecryptor.isEncrypted(tempFile)
			await fs.rm(tempDir, { recursive: true, force: true })
			expect(isEncrypted).toBe(false)
		})

		it("should return true for encrypted file", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.enc")

			// Create encrypted content
			const iv = crypto.randomBytes(IV_LENGTH)
			const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(testKey, "hex"), iv)
			const content = "encrypted content"
			let encrypted = cipher.update(content, "utf-8")
			encrypted = Buffer.concat([encrypted, cipher.final()])
			const encryptedBuffer = Buffer.concat([iv, encrypted])

			await fs.writeFile(tempFile, encryptedBuffer)
			const isEncrypted = await SkillDecryptor.isEncrypted(tempFile)
			await fs.rm(tempDir, { recursive: true, force: true })
			expect(isEncrypted).toBe(true)
		})
	})

	describe("decrypt", () => {
		it("should decrypt an encrypted file correctly", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.enc")

			const originalContent = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the content.
`

			// Encrypt the content using hard-coded key
			const iv = crypto.randomBytes(IV_LENGTH)
			const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(HARD_CODED_KEY, "hex"), iv)
			let encrypted = cipher.update(originalContent, "utf-8")
			encrypted = Buffer.concat([encrypted, cipher.final()])
			const encryptedBuffer = Buffer.concat([iv, encrypted])

			await fs.writeFile(tempFile, encryptedBuffer)

			// Decrypt and verify (using default hard-coded key)
			const decrypted = await SkillDecryptor.decrypt(tempFile)
			await fs.rm(tempDir, { recursive: true, force: true })

			expect(decrypted).toBe(originalContent)
		})

		it("should throw error for file too small", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.enc")

			// Write less than IV_LENGTH bytes
			await fs.writeFile(tempFile, Buffer.from("small"))

			await expect(SkillDecryptor.decrypt(tempFile)).rejects.toThrow(
				"Encrypted file is too small"
			)
			await fs.rm(tempDir, { recursive: true, force: true })
		})
	})

	describe("readSkillFile", () => {
		it("should read a plain text file normally", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.md")
			const content = `---
name: test-skill
description: A test skill
---

# Test Skill

Plain text content.
`
			await fs.writeFile(tempFile, content, "utf-8")
			const result = await SkillDecryptor.readSkillFile(tempFile)
			await fs.rm(tempDir, { recursive: true, force: true })
			expect(result).toBe(content)
		})

		it("should automatically decrypt an encrypted file", async () => {
			const tempDir = await fs.mkdtemp(path.join("/tmp", "skill-test-"))
			const tempFile = path.join(tempDir, "SKILL.enc")

			const originalContent = `---
name: test-skill
description: A test skill
---

# Test Skill

Encrypted content.
`

			// Encrypt the content using hard-coded key
			const iv = crypto.randomBytes(IV_LENGTH)
			const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(HARD_CODED_KEY, "hex"), iv)
			let encrypted = cipher.update(originalContent, "utf-8")
			encrypted = Buffer.concat([encrypted, cipher.final()])
			const encryptedBuffer = Buffer.concat([iv, encrypted])

			await fs.writeFile(tempFile, encryptedBuffer)

			// Read and verify it gets decrypted automatically
			const result = await SkillDecryptor.readSkillFile(tempFile)
			await fs.rm(tempDir, { recursive: true, force: true })

			expect(result).toBe(originalContent)
		})
	})
})
