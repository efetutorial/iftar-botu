require('dotenv').config();

module.exports = {
  // Discord bot token'ı
  token: process.env.DISCORD_BOT_TOKEN,
  
  // Bildirim ayarları
  bildirim: {
    kanalId: process.env.BILDIRIM_KANALI_ID,
    rolId: process.env.BILDIRIM_ROL_ID
  },
  
  // API ayarları (eğer API kullanılacaksa)
  api: {
    collectApiKey: 'YOUR_API_KEY_HERE'
  }
}; 