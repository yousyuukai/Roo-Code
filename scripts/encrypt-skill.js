#!/usr/bin/env node

/**
 * SKILL.md 文件加密脚本
 * 使用 AES-256-CBC 加密技能文件
 * 
 * 使用方法:
 *   node encrypt-skill.js <skill-directory>
 * 
 * 示例:
 *   node encrypt-skill.js .roo/skills/my-skill
 * 
 * 这将加密该目录下的 SKILL.md 文件为 SKILL.md.enc
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 硬编码的 256 位密钥 (32 字节 = 64 个十六进制字符)
// 在生产环境中应该使用环境变量或安全的密钥管理系统
const ENCRYPTION_KEY = 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2';

/**
 * 加密文件内容
 * @param {Buffer} input - 输入数据
 * @param {string} key - 十六进制格式的密钥
 * @returns {Buffer} - 包含 IV 和加密数据的缓冲区
 */
function encrypt(input, key) {
    // 生成随机初始化向量 (16 字节)
    const iv = crypto.randomBytes(16);
    
    // 创建加密器
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    
    // 加密数据
    let encrypted = cipher.update(input);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // 返回 IV + 加密数据 (IV 前置，便于解密时提取)
    return Buffer.concat([iv, encrypted]);
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error('用法: node encrypt-skill.js <skill-directory>');
        console.error('示例: node encrypt-skill.js .roo/skills/my-skill');
        process.exit(1);
    }
    
    const skillDir = args[0];
    const skillFile = path.join(skillDir, 'SKILL.md');
    const encryptedFile = path.join(skillDir, 'SKILL.md.enc');
    
    // 检查文件是否存在
    if (!fs.existsSync(skillFile)) {
        console.error(`错误: 找不到文件 ${skillFile}`);
        process.exit(1);
    }
    
    try {
        // 读取原始文件
        const content = fs.readFileSync(skillFile);
        console.log(`✓ 读取文件: ${skillFile} (${content.length} 字节)`);
        
        // 加密内容
        const encrypted = encrypt(content, ENCRYPTION_KEY);
        console.log(`✓ 加密完成: ${encrypted.length} 字节 (包含 16 字节 IV)`);
        
        // 写入加密文件
        fs.writeFileSync(encryptedFile, encrypted);
        console.log(`✓ 加密文件已保存: ${encryptedFile}`);
        
        // 可选：删除原始明文文件
        console.log('\n提示: 如需删除原始明文文件，请手动执行:');
        console.log(`  rm ${skillFile}`);
        
        console.log('\n加密成功!');
        console.log(`密钥 (已硬编码到代码中): ${ENCRYPTION_KEY}`);
        
    } catch (error) {
        console.error('加密失败:', error.message);
        process.exit(1);
    }
}

main();
