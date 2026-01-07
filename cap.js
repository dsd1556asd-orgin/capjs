// cap-debug.js
const Cap = require("@cap.js/server").default || require("@cap.js/server");
const fs = require("fs/promises");
const path = require("path");

// 简单的文件存储实现
class SimpleFileStore {
  constructor(dir) {
    this.dir = dir;
  }
  
  async init() {
    await fs.mkdir(this.dir, { recursive: true });
  }
  
  async set(key, value) {
    console.log(`[存储] 设置键: ${key.substring(0, 8)}..., 值类型: ${typeof value}`);
    await fs.writeFile(
      path.join(this.dir, key),
      JSON.stringify(value)
    );
  }
  
  async get(key) {
    try {
      const data = await fs.readFile(path.join(this.dir, key), 'utf8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  
  async delete(key) {
    try {
      await fs.unlink(path.join(this.dir, key));
    } catch {}
  }
  
  async list() {
    try {
      return await fs.readdir(this.dir);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }
  
  async deleteByCondition(conditionFn) {
    try {
      const files = await this.list();
      const now = Date.now();
      
      for (const file of files) {
        const data = await this.get(file);
        if (data && conditionFn(data)) {
          await this.delete(file);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }
}

// 初始化存储
const challengesStore = new SimpleFileStore('./data/challenges');
const tokensStore = new SimpleFileStore('./data/tokens');

// 创建CAP实例
async function createCapInstance() {
  console.log("正在初始化CAP存储...");
  await challengesStore.init();
  await tokensStore.init();
  console.log("CAP存储初始化完成");
  
  return new Cap({
    storage: {
      challenges: {
        store: async (token, challengeData) => {
          console.log(`[存储挑战] token: ${token.substring(0, 8)}..., challengeData类型: ${typeof challengeData}`);
          console.log(`[存储挑战] challengeData有expires属性: ${'expires' in challengeData}`);
          console.log(`[存储挑战] challengeData有c属性: ${'c' in challengeData}`);
          
          await challengesStore.set(token, {
            data: challengeData,
            expires: challengeData.expires
          });
        },

        read: async (token) => {
          console.log(`[读取挑战] token: ${token.substring(0, 8)}...`);
          const stored = await challengesStore.get(token);
          
          if (!stored) {
            console.log(`[读取挑战] 未找到数据`);
            return null;
          }
          
          console.log(`[读取挑战] 存储的数据类型: ${typeof stored.data}`);
          console.log(`[读取挑战] 存储的数据有c属性: ${stored.data && 'c' in stored.data}`);
          console.log(`[读取挑战] 存储的数据有expires属性: ${stored.data && 'expires' in stored.data}`);
          
          const now = Date.now();
          if (stored.expires <= now) {
            console.log(`[读取挑战] 数据已过期, expires: ${stored.expires}, now: ${now}`);
            await challengesStore.delete(token);
            return null;
          }
          
          return { 
            challenge: stored.data, 
            expires: Number(stored.expires) 
          };
        },

        delete: async (token) => {
          console.log(`[删除挑战] token: ${token.substring(0, 8)}...`);
          await challengesStore.delete(token);
        },

        deleteExpired: async () => {
          const now = Date.now();
          await challengesStore.deleteByCondition(data => 
            data.expires && data.expires <= now
          );
        },
      },

      tokens: {
        store: async (tokenKey, expires) => {
          console.log(`[存储令牌] key: ${tokenKey.substring(0, 8)}..., expires: ${expires}`);
          await tokensStore.set(tokenKey, { 
            expires: expires 
          });
        },

        get: async (tokenKey) => {
          console.log(`[获取令牌] key: ${tokenKey.substring(0, 8)}...`);
          const stored = await tokensStore.get(tokenKey);
          if (!stored) {
            console.log(`[获取令牌] 未找到数据`);
            return null;
          }
          
          const now = Date.now();
          if (stored.expires <= now) {
            console.log(`[获取令牌] 数据已过期`);
            await tokensStore.delete(tokenKey);
            return null;
          }
          
          return Number(stored.expires);
        },

        delete: async (tokenKey) => {
          console.log(`[删除令牌] key: ${tokenKey.substring(0, 8)}...`);
          await tokensStore.delete(tokenKey);
        },

        deleteExpired: async () => {
          const now = Date.now();
          await tokensStore.deleteByCondition(data => 
            data.expires && data.expires <= now
          );
        },
      },
    },
  });
}

// 创建并导出CAP实例
async function getCapInstance() {
  return await createCapInstance();
}

module.exports = getCapInstance;