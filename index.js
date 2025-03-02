const { Client, GatewayIntentBits, Partials } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment-timezone');
const config = require('./config');
const sabitIftarVakitleri = require('./iftarVakitleri');

// Bot yapılandırması
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel]
});

// Türkiye'nin 81 ili
const iller = [
  'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin', 
  'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 
  'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 
  'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkari', 'Hatay', 'İsparta', 'Mersin', 
  'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli', 
  'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş', 'Nevşehir', 
  'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Tekirdağ', 'Tokat', 
  'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak', 'Aksaray', 'Bayburt', 
  'Karaman', 'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan', 'İğdır', 'Yalova', 'Karabük', 
  'Kilis', 'Osmaniye', 'Düzce'
];

// İftar vakitlerini saklamak için nesne
const iftarVakitleri = {};

// Bildirim kanalı ve rol ID'leri
const BILDIRIM_KANALI_ID = config.bildirim.kanalId;
const BILDIRIM_ROL_ID = config.bildirim.rolId;

// Namaz Vakti API URL'i
const API_BASE_URL = 'https://vakit.vercel.app/api';

// İftar (Akşam namazı) vakitlerini API'den almak için fonksiyon
async function iftarVakitleriniGuncelle() {
  try {
    const bugun = moment().tz('Europe/Istanbul').format('YYYY-MM-DD');
    
    for (const il of iller) {
      const ilLower = il.toLowerCase();
      
      try {
        // API'den şehir araması yap
        const searchUrl = `${API_BASE_URL}/searchPlaces?q=${il}&lang=tr`;
        console.log(`${il} için arama URL'i: ${searchUrl}`);
        
        const searchResponse = await axios.get(searchUrl);
        
        console.log(`${il} için arama sonuçları:`, JSON.stringify(searchResponse.data).substring(0, 500));
        
        // Arama sonuçlarını kontrol et
        if (searchResponse.data && searchResponse.data.length > 0) {
          // Türkiye'deki şehirleri filtrele
          const turkiyeSehirleri = searchResponse.data.filter(sehir => 
            sehir.country === 'Turkey' || 
            sehir.country === 'Turkiye' || 
            sehir.country === 'Türkiye' || 
            sehir.country === 'TR' || 
            sehir.name.toLowerCase() === il.toLowerCase()
          );
          
          // Önce Türkiye'deki şehirleri kontrol et
          if (turkiyeSehirleri.length > 0) {
            const sehirBilgisi = turkiyeSehirleri[0];
            const sehirID = sehirBilgisi.id;
            
            console.log(`${il} için şehir ID bulundu: ${sehirID} (${sehirBilgisi.name}, ${sehirBilgisi.country})`);
            
            // Şehir ID'sinden namaz vakitlerini al
            const response = await axios.get(`${API_BASE_URL}/timesForPlace`, {
              params: {
                id: sehirID,
                date: bugun,
                days: 1,
                timezoneOffset: 180, // Türkiye için UTC+3
                calculationMethod: 'Turkey'
              }
            });
            
            console.log(`${il} için API yanıtı alındı. Tarih: ${bugun}`);
            
            if (response.data && response.data.times && response.data.times[bugun]) {
              // Namaz vakitleri dizisi: [imsak, güneş, öğle, ikindi, akşam, yatsı]
              const namazVakitleri = response.data.times[bugun];
              console.log(`${il} için namaz vakitleri: İmsak: ${namazVakitleri[0]}, Güneş: ${namazVakitleri[1]}, Öğle: ${namazVakitleri[2]}, İkindi: ${namazVakitleri[3]}, Akşam: ${namazVakitleri[4]}, Yatsı: ${namazVakitleri[5]}`);
              
              const aksam = namazVakitleri[4]; // Akşam namazı vakti (iftar vakti)
              iftarVakitleri[ilLower] = aksam;
              console.log(`${il} için iftar vakti güncellendi: ${aksam}`);
            } else {
              // API'den veri alınamazsa sabit verileri kullan
              if (sabitIftarVakitleri[ilLower]) {
                iftarVakitleri[ilLower] = sabitIftarVakitleri[ilLower];
                console.log(`${il} için sabit iftar vakti kullanıldı: ${sabitIftarVakitleri[ilLower]}`);
              } else {
                console.warn(`${il} için iftar vakti bulunamadı.`);
              }
            }
          } else {
            console.warn(`${il} için Türkiye'de şehir bulunamadı.`);
            // Türkiye'de şehir bulunamazsa sabit verileri kullan
            if (sabitIftarVakitleri[ilLower]) {
              iftarVakitleri[ilLower] = sabitIftarVakitleri[ilLower];
              console.log(`${il} için sabit iftar vakti kullanıldı: ${sabitIftarVakitleri[ilLower]}`);
            } else {
              console.warn(`${il} için iftar vakti bulunamadı.`);
            }
          }
        } else {
          console.warn(`${il} için şehir bilgisi bulunamadı.`);
          // Şehir bulunamazsa sabit verileri kullan
          if (sabitIftarVakitleri[ilLower]) {
            iftarVakitleri[ilLower] = sabitIftarVakitleri[ilLower];
            console.log(`${il} için sabit iftar vakti kullanıldı: ${sabitIftarVakitleri[ilLower]}`);
          } else {
            console.warn(`${il} için iftar vakti bulunamadı.`);
          }
        }
        
        // API'yi çok hızlı sorgulamamak için kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`${il} için iftar vakti güncellenirken hata oluştu:`, error.message);
        
        // Hata durumunda sabit verileri kullan
        if (sabitIftarVakitleri[ilLower]) {
          iftarVakitleri[ilLower] = sabitIftarVakitleri[ilLower];
          console.log(`${il} için sabit iftar vakti kullanıldı: ${sabitIftarVakitleri[ilLower]}`);
        }
      }
    }
    
    console.log('Tüm iftar vakitleri güncellendi.');
    return true;
  } catch (error) {
    console.error('İftar vakitlerini güncellerken hata oluştu:', error.message);
    return false;
  }
}

// Kalan süreyi hesaplayan fonksiyon
function kalanSureyiHesapla(iftarVakti) {
  const simdikiZaman = moment().tz('Europe/Istanbul');
  const iftarZamani = moment.tz(moment().format('YYYY-MM-DD') + ' ' + iftarVakti, 'YYYY-MM-DD HH:mm', 'Europe/Istanbul');
  
  // Eğer iftar vakti geçmişse, bir sonraki günün iftar vaktini hesapla
  if (simdikiZaman.isAfter(iftarZamani)) {
    iftarZamani.add(1, 'days');
  }
  
  const fark = iftarZamani.diff(simdikiZaman);
  const sure = moment.duration(fark);
  
  const saat = Math.floor(sure.asHours());
  const dakika = sure.minutes();
  const saniye = sure.seconds();
  
  return {
    saat,
    dakika,
    saniye,
    toplam_saniye: fark / 1000
  };
}

// Her il için iftar vakti geldiğinde bildirim gönderen fonksiyon
function iftarBildirimleriniAyarla() {
  // Önceki cron görevlerini temizle
  Object.keys(cron.getTasks()).forEach(taskId => {
    cron.getTasks()[taskId].stop();
  });
  
  for (const il of iller) {
    const ilLower = il.toLowerCase();
    if (iftarVakitleri[ilLower]) {
      const iftarVakti = iftarVakitleri[ilLower];
      const [saat, dakika] = iftarVakti.split(':');
      
      // Her gün belirtilen saatte çalışacak cron görevi
      cron.schedule(`${dakika} ${saat} * * *`, () => {
        const bildirimKanali = client.channels.cache.get(BILDIRIM_KANALI_ID);
        if (bildirimKanali) {
          // @everyone, @here ve rol etiketlerini engellemek için allowedMentions kullan
          bildirimKanali.send({
            content: `<@&${BILDIRIM_ROL_ID}> ${il} için iftar vakti`,
            allowedMentions: { 
              parse: ['users'],
              roles: [BILDIRIM_ROL_ID] // Sadece belirli rol etiketlenebilir
            }
          });
          console.log(`${il} için iftar bildirimi gönderildi.`);
        } else {
          console.error(`Bildirim kanalı bulunamadı: ${BILDIRIM_KANALI_ID}`);
        }
      }, {
        timezone: 'Europe/Istanbul'
      });
      
      console.log(`${il} için iftar bildirimi ayarlandı: ${iftarVakti}`);
    }
  }
}

// Bot hazır olduğunda
client.once('ready', async () => {
  console.log(`${client.user.tag} olarak giriş yapıldı!`);
  
  // İftar vakitlerini güncelle
  console.log('İftar vakitleri güncelleniyor...');
  const basarili = await iftarVakitleriniGuncelle();
  
  if (basarili) {
    // İftar bildirimlerini ayarla
    iftarBildirimleriniAyarla();
    
    console.log('Bot başarıyla başlatıldı ve iftar bildirimleri ayarlandı.');
    
    // Her gün saat 00:05'te iftar vakitlerini güncelle
    cron.schedule('5 0 * * *', async () => {
      console.log('Günlük iftar vakitleri güncellemesi başlatılıyor...');
      await iftarVakitleriniGuncelle();
      iftarBildirimleriniAyarla();
      console.log('Günlük iftar vakitleri güncellemesi tamamlandı.');
    }, {
      timezone: 'Europe/Istanbul'
    });
  } else {
    console.error('İftar vakitleri güncellenemediği için sabit veriler kullanılacak.');
    // Sabit verileri yükle
    for (const il of iller) {
      const ilLower = il.toLowerCase();
      if (sabitIftarVakitleri[ilLower]) {
        iftarVakitleri[ilLower] = sabitIftarVakitleri[ilLower];
      }
    }
    iftarBildirimleriniAyarla();
  }
});

// Mesaj alındığında
client.on('messageCreate', async (message) => {
  // Botun kendi mesajlarını yanıtlamaması için kontrol
  if (message.author.bot) return;
  
  // Mesaj içeriğini kontrol et
  const content = message.content.toLowerCase().trim();
  
  // "iftar [şehir]" formatında mı?
  if (content.startsWith('iftar ')) {
    const sehir = content.substring(6).trim();
    
    // Şehir adı geçerli mi?
    if (iftarVakitleri[sehir]) {
      const iftarVakti = iftarVakitleri[sehir];
      const kalanSure = kalanSureyiHesapla(iftarVakti);
      
      // Şehir adının ilk harfini büyük yap
      const formatliSehir = sehir.charAt(0).toUpperCase() + sehir.slice(1);
      
      message.reply({
        content: `${formatliSehir} için iftar vakti ${iftarVakti}'dir. Kalan süre ${kalanSure.saat} saat ${kalanSure.dakika} dakika ${kalanSure.saniye} saniyedir.`,
        allowedMentions: { parse: ['users'] }
      });
    } else {
      // Şehir adı bulunamadıysa, API'den doğrudan sorgula
      try {
        const bugun = moment().tz('Europe/Istanbul').format('YYYY-MM-DD');
        
        // Şehir adını normalize et
        const normalizedSehir = sehir.toLowerCase();
        
        // API'den şehir araması yap
        const searchUrl = `${API_BASE_URL}/searchPlaces?q=${sehir}&lang=tr`;
        console.log(`${sehir} için arama URL'i: ${searchUrl}`);
        
        const searchResponse = await axios.get(searchUrl);
        
        console.log(`${sehir} için arama sonuçları:`, JSON.stringify(searchResponse.data).substring(0, 500));
        
        // Arama sonuçlarını kontrol et
        if (searchResponse.data && searchResponse.data.length > 0) {
          // Türkiye'deki şehirleri filtrele
          const turkiyeSehirleri = searchResponse.data.filter(s => 
            s.country === 'Turkey' || 
            s.country === 'Turkiye' || 
            s.country === 'Türkiye' || 
            s.country === 'TR' || 
            s.name.toLowerCase() === sehir.toLowerCase()
          );
          
          // Önce Türkiye'deki şehirleri kontrol et
          if (turkiyeSehirleri.length > 0) {
            const sehirBilgisi = turkiyeSehirleri[0];
            const sehirID = sehirBilgisi.id;
            
            console.log(`${sehir} için şehir ID bulundu: ${sehirID} (${sehirBilgisi.name}, ${sehirBilgisi.country})`);
            
            // Şehir ID'sinden namaz vakitlerini al
            const vakitResponse = await axios.get(`${API_BASE_URL}/timesForPlace`, {
              params: {
                id: sehirID,
                date: bugun,
                days: 1,
                timezoneOffset: 180,
                calculationMethod: 'Turkey'
              }
            });
            
            console.log(`${sehir} için API yanıtı alındı. Tarih: ${bugun}`);
            
            if (vakitResponse.data && vakitResponse.data.times && vakitResponse.data.times[bugun]) {
              // Namaz vakitleri dizisi: [imsak, güneş, öğle, ikindi, akşam, yatsı]
              const namazVakitleri = vakitResponse.data.times[bugun];
              console.log(`${sehir} için namaz vakitleri: İmsak: ${namazVakitleri[0]}, Güneş: ${namazVakitleri[1]}, Öğle: ${namazVakitleri[2]}, İkindi: ${namazVakitleri[3]}, Akşam: ${namazVakitleri[4]}, Yatsı: ${namazVakitleri[5]}`);
              
              const aksam = namazVakitleri[4]; // Akşam namazı vakti (iftar vakti)
              iftarVakitleri[normalizedSehir] = aksam;
              
              // Kalan süreyi hesapla
              const kalanSure = kalanSureyiHesapla(aksam);
              
              // Şehir adını düzgün formatta al
              const formatliSehir = sehir.charAt(0).toUpperCase() + sehir.slice(1);
              
              message.reply({
                content: `${formatliSehir} için iftar vakti ${aksam}'dir. Kalan süre ${kalanSure.saat} saat ${kalanSure.dakika} dakika ${kalanSure.saniye} saniyedir. İftar akşam ezanı saatinde okunur.`,
                allowedMentions: { parse: ['users'] }
              });
            } else {
              // API'den veri alınamazsa sabit verileri kullan
              if (sabitIftarVakitleri[normalizedSehir]) {
                const iftarVakti = sabitIftarVakitleri[normalizedSehir];
                const kalanSure = kalanSureyiHesapla(iftarVakti);
                const formatliSehir = sehir.charAt(0).toUpperCase() + sehir.slice(1);
                
                iftarVakitleri[normalizedSehir] = iftarVakti;
                
                message.reply({
                  content: `${formatliSehir} için iftar vakti ${iftarVakti}'dir. Kalan süre ${kalanSure.saat} saat ${kalanSure.dakika} dakika ${kalanSure.saniye} saniyedir. İftar akşam ezanı saatinde okunur.`,
                  allowedMentions: { parse: ['users'] }
                });
              } else {
                message.reply({
                  content: `Üzgünüm, "${sehir}" için iftar vakti bilgisi bulunamadı. Lütfen geçerli bir şehir adı girin.`,
                  allowedMentions: { parse: ['users'] }
                });
              }
            }
          } else {
            console.warn(`${sehir} için Türkiye'de şehir bulunamadı.`);
            // Türkiye'de şehir bulunamazsa sabit verileri kullan
            if (sabitIftarVakitleri[normalizedSehir]) {
              const iftarVakti = sabitIftarVakitleri[normalizedSehir];
              const kalanSure = kalanSureyiHesapla(iftarVakti);
              const formatliSehir = sehir.charAt(0).toUpperCase() + sehir.slice(1);
              
              iftarVakitleri[normalizedSehir] = iftarVakti;
              
              message.reply({
                content: `${formatliSehir} için iftar vakti ${iftarVakti}'dir. Kalan süre ${kalanSure.saat} saat ${kalanSure.dakika} dakika ${kalanSure.saniye} saniyedir. İftar akşam ezanı saatinde okunur.`,
                allowedMentions: { parse: ['users'] }
              });
            } else {
              message.reply({
                content: `Üzgünüm, "${sehir}" için iftar vakti bilgisi bulunamadı. Lütfen geçerli bir şehir adı girin.`,
                allowedMentions: { parse: ['users'] }
              });
            }
          }
        } else {
          // Şehir bulunamazsa sabit iftar vakitlerini kontrol et
          if (sabitIftarVakitleri[normalizedSehir]) {
            const iftarVakti = sabitIftarVakitleri[normalizedSehir];
            const kalanSure = kalanSureyiHesapla(iftarVakti);
            const formatliSehir = sehir.charAt(0).toUpperCase() + sehir.slice(1);
            
            iftarVakitleri[normalizedSehir] = iftarVakti;
            
            message.reply({
              content: `${formatliSehir} için iftar vakti ${iftarVakti}'dir. Kalan süre ${kalanSure.saat} saat ${kalanSure.dakika} dakika ${kalanSure.saniye} saniyedir. İftar akşam ezanı saatinde okunur.`,
              allowedMentions: { parse: ['users'] }
            });
          } else {
            message.reply({
              content: `Üzgünüm, "${sehir}" için iftar vakti bilgisi bulunamadı. Lütfen geçerli bir şehir adı girin.`,
              allowedMentions: { parse: ['users'] }
            });
          }
        }
      } catch (error) {
        console.error(`${sehir} için iftar vakti sorgulanırken hata oluştu:`, error.message);
        message.reply({
          content: `Üzgünüm, "${sehir}" için iftar vakti bilgisi alınamadı. Lütfen daha sonra tekrar deneyin.`,
          allowedMentions: { parse: ['users'] }
        });
      }
    }
  }
});

client.login(config.token);