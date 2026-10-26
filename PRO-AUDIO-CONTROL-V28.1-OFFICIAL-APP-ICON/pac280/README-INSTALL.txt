PRO-AUDIO-CONTROL V27.9 — ACTIVE PAD COUNTDOWN + AUDIO PLAYBACK FIX + GLASSY DASHBOARD

PEMBARUAN V27.9
- Countdown sisa durasi materi tampil di bar PADS ON, tepat di samping nama setiap PAD yang sedang aktif. Angka timer dibuat besar agar mudah terbaca operator.
- Perbaikan playback PAD: AudioContext/visualizer di-resume dan ditunggu sebelum audio dimulai, untuk mencegah status PLAY aktif tetapi suara tidak keluar pada browser tertentu.
- Tampilan GLASSY DASHBOARD diperkuat: panel transparan berlapis, blur lebih jelas, tepi bercahaya, dan efek kaca pada operator bar, PAD, panel Music Player, dan pengaturan. Pilihan tema tetap tersedia di Settings.
- Isi, urutan materi, playlist, rundown, catatan, shortcut, dan struktur kerja utama dipertahankan.
- Catatan: output audio tetap bergantung pada format file yang didukung browser, volume perangkat, dan izin audio. Uji playback aktual sebelum dipakai live.

PRO-AUDIO-CONTROL V27.5 — WINDOW CONTROLS + PAGE ZOOM + SAVE LOCATION + SESSION + SHORTCUTS

KONTROL TAMPILAN V27.5
- Tombol − memperkecil tampilan halaman dalam langkah 10%, dari 100% sampai minimum 70%.
- Tombol + memperbesar tampilan halaman dalam langkah 10%, sampai maksimum 130%.
- Persentase zoom disimpan pada browser/perangkat tersebut, sehingga pengaturan terakhir dipakai lagi saat aplikasi dibuka.
- Tombol □ mencoba membuka mode layar penuh (maximize) melalui fitur fullscreen browser; tekan ikon pulihkan atau Escape untuk kembali. Jika browser menolak fullscreen, aplikasi menggunakan mode tampilan alternatif.
- Tombol — tetap meminimalkan dashboard ke mini bar. Tombol × tetap menampilkan konfirmasi penutupan tampilan. Browser tidak mengizinkan halaman menutup tab/jendela secara paksa.
- Zoom halaman berbeda dari zoom browser. Gunakan kontrol +/− di header aplikasi; jika dibutuhkan, zoom browser tetap dapat dipakai sebagai cadangan.

KONTROL MINIMIZE & CLOSE V27.4
- Tombol — pada header menyembunyikan dashboard ke mini bar di bagian bawah; klik KEMBALIKAN untuk kembali. Sesi dan susunan materi tetap berada di halaman, dan audio dapat terus berjalan selama browser tetap aktif.
- Tombol × meminta konfirmasi, lalu menampilkan layar tutup dengan tombol BUKA KEMBALI APLIKASI.
- Batasan browser: halaman web tidak diizinkan menutup tab/jendela browser secara paksa. Untuk benar-benar keluar, tutup tab atau jendela melalui kontrol browser/perangkat. Jika audio sedang aktif, hentikan playback terlebih dahulu sebelum menutup browser.
- Pada layar kecil, kontrol jendela mengikuti aturan responsif aplikasi; beberapa tombol header mungkin disembunyikan agar ruang tetap cukup.



FITUR SAVE SESSION V27.3 — NAMA FILE & LOKASI
- Klik SAVE SESSION untuk membuka dialog modern dan mengisi nama file sendiri.
- Ekstensi .pacsession ditambahkan otomatis; jangan perlu mengetik ekstensi.
- Pada browser yang mendukung File System Access API (umumnya Chrome/Edge desktop pada konteks aman), klik PILIH LOKASI & SIMPAN untuk memilih folder serta nama file melalui dialog penyimpanan perangkat.
- Jika browser tidak mendukung pemilih lokasi langsung, file diunduh memakai nama yang Anda tentukan. Lokasi penyimpanan mengikuti pengaturan unduhan browser/perangkat; untuk memilih folder, atur lokasi unduhan browser atau aktifkan opsi “tanyakan lokasi penyimpanan” bila tersedia.
- Jika dialog native dibatalkan, penyimpanan dibatalkan dan sesi aktif tidak diubah.
- Contoh nama: FYP-22-Oktober-2026, LAPOR-PAK-EPISODE-01, atau ALLO-FEST-2026.

KONFIRMASI MODERN V27.2
- Desain popup konfirmasi futuristik bergaya dark-glass dengan tombol BATAL dan aksi yang jelas.
- Konfirmasi muncul untuk menghapus satu track, mengosongkan seluruh playlist, mengosongkan materi PAD, menghapus catatan, dan mengganti sesi aktif melalui LOAD SESSION.
- Jika BATAL ditekan, materi yang sedang aktif tetap dipertahankan.
- Popup dapat ditutup dengan tombol Escape atau menekan area luar dialog.
- Aksi live seperti PLAY, STOP, CUE, LOOP, dan FADE tidak diberi konfirmasi tambahan agar tidak menghambat operator.
- Susunan 15 PAD dan urutan playlist tidak diubah oleh pembaruan ini.

FUNGSI BARU
- SAVE SESSION membuat satu file mandiri berformat .pacsession. Audio tiap PAD dan semua track playlist ikut disimpan di dalam file tersebut.
- LOAD SESSION memulihkan sesi dari satu file saja. Anda tidak perlu memilih ulang setiap file audio.
- Sesi menjaga posisi 15 PAD, nama pad, file yang terpasang, volume pad, loop, urutan playlist, track playlist terpilih, volume master/music, fade time, skin, visualizer, font, catatan, dan status lock.
- Saat SESSION dimuat, audio tidak langsung diputar. Semua materi dimuat dan siap dimainkan dengan tombol PLAY atau shortcut.
- File SESSION bisa dipindahkan ke perangkat lain yang menjalankan aplikasi ini. Karena audio dimasukkan ke file sesi, ukuran file bisa besar sesuai total durasi/ukuran audio.

SHORTCUT LAPTOP / DESKTOP
- 1–9: putar PAD 1–9.
- 0: putar PAD 10.
- Q / W / E / R / T: putar PAD 11–15.
- Z: STOP PAD terakhir yang dipilih/dipicu (jika belum ada, STOP ALL).
- X: aktif/nonaktifkan LOOP pada PAD terakhir yang dipilih/dipicu.
- C: FADE OUT PAD terakhir yang dipilih/dipicu; tidak memulai ulang playback.
- SPACE: FADE OUT ALL PADS (pad berhenti setelah fade selesai).
- SHIFT + SPACE: STOP ALL langsung, termasuk Music Player.
- Shortcut dibatasi untuk perangkat desktop dengan keyboard; penekanan tombol tidak dijalankan saat sedang mengetik pada catatan atau field teks.
- Lock pad mencegah perubahan/play melalui klik sentuh pada pad, tetapi tidak memblokir shortcut keyboard.

INSTALASI
Windows: buka aplikasi menggunakan Chrome/Edge, lalu pilih Install app bila tersedia.
Android: buka menggunakan Chrome, lalu pilih Install app / Add to Home Screen.
iPhone/iPad: buka menggunakan Safari, lalu Share > Add to Home Screen.
PWA install memerlukan HTTPS atau localhost.

CARA KERJA SAVE / LOAD
1. Muat file audio ke masing-masing PAD dan ke playlist Music Player sesuai urutan kerja.
2. Atur nama, volume, loop, catatan, fade time, dan pengaturan lain.
3. Klik SAVE SESSION. Simpan file .pacsession di folder yang mudah ditemukan.
4. Pada sesi kerja berikutnya, buka aplikasi dan klik LOAD SESSION, lalu pilih file .pacsession tersebut.
5. Tunggu sampai status SESSION siap; semua file dan urutan dipulihkan. Tekan PLAY untuk memulai audio.

CATATAN
- Jangan ubah isi file .pacsession secara manual.
- Ukuran file sesi dapat besar karena semua audio disertakan untuk memastikan materi tetap tersedia saat sesi dimuat.
- Untuk berjaga-jaga, simpan salinan file .pacsession di laptop/drive penyimpanan.
- Build ini mempertahankan dashboard 15 PAD dan susunan playlist yang sudah ada; materi tidak otomatis diurutkan ulang saat sesi dipulihkan.


UPDATE V28.0
- Timer countdown tetap ditampilkan pada bar PADS ON di sebelah jumlah pad aktif (Aman).
- Countdown pada kartu masing-masing PAD dihilangkan agar area pad hanya menonjolkan nama/judul materi.
- Bar waktu countdown TIME - pada setiap kartu PAD disembunyikan; informasi durasi berjalan/durasi total tetap tersedia.
- Tidak mengubah daftar materi, audio, shortcut, maupun layout utama lainnya.

IKON RESMI APLIKASI — V28.1
- Ikon baru neon biru PRO-AUDIO-CONTROL sudah diterapkan pada ikon PWA, favicon, dan Apple touch icon.
- File icons/app-icon.ico disediakan sebagai ikon untuk shortcut/launcher Windows.
- Jika ikon lama masih terlihat setelah update PWA, tutup aplikasi/browser sepenuhnya, hapus shortcut lama lalu buat ulang shortcut dari browser. Pada Android, jika perlu hapus instalasi PWA lama lalu pasang ulang dari browser setelah membuka versi terbaru.
- Perubahan ini hanya mengganti aset ikon dan cache version; tidak mengubah fitur audio atau layout aplikasi.
