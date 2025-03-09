# İftar Sorgu Discord Botu

Bu Discord botu, Türkiye'nin 81 ili için iftar vakitlerini sorgulama ve otomatik bildirim gönderme özelliklerine sahiptir. Bot, [vakit.vercel.app](https://vakit.vercel.app/) API'sini kullanarak güncel namaz vakitlerini alır.

## Özellikler

- Herhangi bir kanalda `iftar [şehir]` yazarak iftar vaktini öğrenme (örn: `iftar istanbul`)
- İftar vaktine kalan süreyi saat, dakika ve saniye olarak görüntüleme
- Her ilin iftar vaktinde otomatik bildirim gönderme
- Günlük olarak iftar vakitlerini otomatik güncelleme
- API'den veri alınamadığında yedek olarak sabit verileri kullanma

## Kurulum

1. Bu repoyu klonlayın:
```bash
git clone https://github.com/efetutorial/iftar-botu
cd iftar-sorgu-bot
```

2. Gerekli paketleri yükleyin:
```bash
npm install
```


5. Botu başlatın:
```bash
npm start
```

## Kullanım

- Herhangi bir kanalda `iftar [şehir]` yazarak o şehir için iftar vaktini ve kalan süreyi öğrenebilirsiniz.
- Bot, her ilin iftar vaktinde belirtilen kanala otomatik bildirim gönderecektir.

## Teknik Detaylar

- Bot, [vakit.vercel.app](https://vakit.vercel.app/) API'sini kullanarak güncel namaz vakitlerini alır.
- API'den veri alınamadığında, `iftarVakitleri.js` dosyasındaki sabit veriler kullanılır.
- Her gün saat 00:05'te iftar vakitleri otomatik olarak güncellenir.
- Bot, Türkiye saatini (Europe/Istanbul) baz alarak çalışır.

## Notlar

- Bot, Türkiye saatini (Europe/Istanbul) baz alarak çalışır.
- API'den veri alınamadığında, `iftarVakitleri.js` dosyasındaki sabit veriler kullanılır.
- Sabit iftar vakitleri her Ramazan ayında güncellenmelidir.


## Teşekkürler

- [vakit.vercel.app](https://vakit.vercel.app/) - Namaz vakitleri API'si için 
