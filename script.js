        function showAlert(message) {
            return new Promise((resolve) => {
                const overlay = document.getElementById('customDialogOverlay');
                document.getElementById('customDialogMessage').textContent = message;
                document.getElementById('customDialogInputWrap').style.display = 'none';
                const cancelBtn = document.getElementById('customDialogCancelBtn');
                const okBtn = document.getElementById('customDialogOkBtn');
                cancelBtn.style.display = 'none';
                okBtn.textContent = 'OK';
                overlay.style.display = 'flex';
                const cleanup = () => { overlay.style.display = 'none'; okBtn.onclick = null; };
                okBtn.onclick = () => { cleanup(); resolve(); };
            });
        }

        function showConfirm(message) {
            return new Promise((resolve) => {
                const overlay = document.getElementById('customDialogOverlay');
                document.getElementById('customDialogMessage').textContent = message;
                document.getElementById('customDialogInputWrap').style.display = 'none';
                const cancelBtn = document.getElementById('customDialogCancelBtn');
                const okBtn = document.getElementById('customDialogOkBtn');
                cancelBtn.style.display = 'inline-flex';
                cancelBtn.textContent = 'Batal';
                okBtn.textContent = 'Ya, Lanjutkan';
                overlay.style.display = 'flex';
                const cleanup = () => { overlay.style.display = 'none'; okBtn.onclick = null; cancelBtn.onclick = null; };
                okBtn.onclick = () => { cleanup(); resolve(true); };
                cancelBtn.onclick = () => { cleanup(); resolve(false); };
            });
        }

        function showPrompt(message, defaultValue) {
            return new Promise((resolve) => {
                const overlay = document.getElementById('customDialogOverlay');
                document.getElementById('customDialogMessage').textContent = message;
                const inputWrap = document.getElementById('customDialogInputWrap');
                const input = document.getElementById('customDialogInput');
                inputWrap.style.display = 'block';
                input.value = defaultValue || '';
                const cancelBtn = document.getElementById('customDialogCancelBtn');
                const okBtn = document.getElementById('customDialogOkBtn');
                cancelBtn.style.display = 'inline-flex';
                cancelBtn.textContent = 'Batal';
                okBtn.textContent = 'OK';
                overlay.style.display = 'flex';
                setTimeout(() => input.focus(), 50);
                const cleanup = () => { overlay.style.display = 'none'; okBtn.onclick = null; cancelBtn.onclick = null; input.onkeydown = null; inputWrap.style.display = 'none'; };
                okBtn.onclick = () => { const v = input.value; cleanup(); resolve(v); };
                cancelBtn.onclick = () => { cleanup(); resolve(null); };
                input.onkeydown = (e) => { if (e.key === 'Enter') okBtn.onclick(); };
            });
        }

        function escapeHtml(str) {
            if (str === null || str === undefined) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function formatRupiahInput(ele) {
            let val = ele.value.replace(/[^0-9]/g, '');
            if (val) ele.value = new Intl.NumberFormat('id-ID').format(val);
            else ele.value = '';
        }
        function parseRp(valStr) {
            if (!valStr) return 0;
            return Number(valStr.toString().replace(/\./g, ''));
        }
        const formatRp = (num) => new Intl.NumberFormat('id-ID').format(num);
        const formatTgl = (isoString) => {
            const d = new Date(isoString);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth()+1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        };

        const SUPABASE_URL = "https://tlldnxzclnlxyfrikgsi.supabase.co";
        const SUPABASE_ANON_KEY = "sb_publishable_vqFLtSaTzefFiE9L1UAE0g_h4cBdKAj";
        const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let db = { inventory: [], sales: [], expenses: [], returns: [] };
        let cart = [];
        let currentBrandFilter = 'SEMUA';
        let currentEditId = null;

        function productToRow(p) {
            return { id: p.id, merek: p.merek, nama: p.nama, stok: p.stok, harga_supp: p.hargaSupp, diskon1: p.diskon1 || 0, diskon2: p.diskon2 || 0, diskon3: p.diskon3 || 0, modal_akhir: p.modalAkhir, jual: p.jual };
        }
        function rowToProduct(r) {
            return { id: r.id, merek: r.merek, nama: r.nama, stok: r.stok, hargaSupp: r.harga_supp, diskon1: r.diskon1, diskon2: r.diskon2, diskon3: r.diskon3, modalAkhir: r.modal_akhir, jual: r.jual };
        }
        function saleToRow(s) {
            return { id: s.id, tgl: s.tgl, customer: s.customer, items: s.items, total_modal: s.totalModal, total_pemasukan: s.totalPemasukan, status: s.status, dibayar: s.dibayar, sisa_hutang: s.sisaHutang };
        }
        function rowToSale(r) {
            return { id: r.id, tgl: r.tgl, customer: r.customer, items: r.items, totalModal: r.total_modal, totalPemasukan: r.total_pemasukan, status: r.status, dibayar: r.dibayar, sisaHutang: r.sisa_hutang };
        }
        function returnToRow(x) {
            return { id: x.id, tgl: x.tgl, nota_id: x.notaId, nama_barang: x.namaBarang, qty: x.qty, nilai_dikembalikan: x.nilaiDikembalikan, modal_dikembalikan: x.modalDikembalikan };
        }
        function rowToReturn(r) {
            return { id: r.id, tgl: r.tgl, notaId: r.nota_id, namaBarang: r.nama_barang, qty: r.qty, nilaiDikembalikan: r.nilai_dikembalikan, modalDikembalikan: r.modal_dikembalikan };
        }
        function expenseToRow(e) {
            return { id: e.id, tgl: e.tgl, ket: e.ket, nominal: e.nominal };
        }
        function rowToExpense(r) {
            return { id: r.id, tgl: r.tgl, ket: r.ket, nominal: r.nominal };
        }

        async function loadAllData() {
            const [prodRes, saleRes, expRes, retRes] = await Promise.all([
                sb.from('products').select('*').order('id'),
                sb.from('sales').select('*').order('tgl'),
                sb.from('expenses').select('*').order('tgl'),
                sb.from('returns').select('*').order('tgl'),
            ]);
            const firstError = prodRes.error || saleRes.error || expRes.error || retRes.error;
            if (firstError) throw firstError;
            db.inventory = prodRes.data.map(rowToProduct);
            db.sales = saleRes.data.map(rowToSale);
            db.expenses = expRes.data.map(rowToExpense);
            db.returns = retRes.data.map(rowToReturn);
        }

        function switchTab(tabId, btn) {
            document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btn.classList.add('active');

            if(tabId === 'stok') renderStok();
            if(tabId === 'kasir') renderListKasir();
            if(tabId === 'riwayat') {
                document.getElementById('filterRiwayatAwal').valueAsDate = new Date();
                document.getElementById('filterRiwayatAkhir').valueAsDate = new Date();
                renderRiwayat();
            }
            if(tabId === 'kasbon') renderKasBon();
            if(tabId === 'pengeluaran') {
                document.getElementById('filterPengeluaranAwal').valueAsDate = new Date();
                document.getElementById('filterPengeluaranAkhir').valueAsDate = new Date();
                document.getElementById('tglKeluar').valueAsDate = new Date(); 
                renderPengeluaran();
            }
            if(tabId === 'laporan') {
                document.getElementById('lapTglAwal').valueAsDate = new Date();
                document.getElementById('lapTglAkhir').valueAsDate = new Date();
                renderLaporan();
            }
        }

        function backupData() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
            const downloadAnchorElem = document.createElement('a');
            downloadAnchorElem.setAttribute("href", dataStr);
            downloadAnchorElem.setAttribute("download", "Backup_ACON_" + new Date().toLocaleDateString('id-ID').replace(/\//g, '-') + ".json");
            document.body.appendChild(downloadAnchorElem); 
            downloadAnchorElem.click();
            downloadAnchorElem.remove();
        }

        function restoreData(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const importedDB = JSON.parse(e.target.result);
                    if(!importedDB.inventory || !importedDB.sales) { showAlert("File salah."); return; }
                    if(!await showConfirm('Ini akan MENGGANTI SELURUH data di database dengan isi file backup ini. Yakin lanjut?')) return;

                    await sb.from('products').delete().gt('id', 0);
                    await sb.from('sales').delete().neq('id', '');
                    await sb.from('expenses').delete().gt('id', 0);
                    await sb.from('returns').delete().gt('id', 0);

                    if (importedDB.inventory.length) await sb.from('products').insert(importedDB.inventory.map(productToRow));
                    if (importedDB.sales.length) await sb.from('sales').insert(importedDB.sales.map(saleToRow));
                    if (importedDB.expenses?.length) await sb.from('expenses').insert(importedDB.expenses.map(expenseToRow));
                    if (importedDB.returns?.length) await sb.from('returns').insert(importedDB.returns.map(returnToRow));

                    showAlert("Data dipulihkan!");
                    window.location.reload();
                } catch(err) { showAlert("Error: " + err.message); }
            };
            reader.readAsText(file);
        }

        function updateMerekDinamis() {
            const uniqueBrands = [...new Set(db.inventory.map(item => item.merek))].sort();
            const datalist = document.getElementById('listMerekDin'); datalist.innerHTML = '';
            const filterContainer = document.getElementById('brandFilters');
            filterContainer.innerHTML = `<button class="brand-btn ${currentBrandFilter === 'SEMUA' ? 'active' : ''}" onclick="filterMerek('SEMUA', this)">SEMUA MEREK</button>`;
            const kasirSelect = document.getElementById('filterMerekKasir');
            const currentKasirVal = kasirSelect.value; 
            kasirSelect.innerHTML = `<option value="SEMUA">Semua Merek</option>`;

            uniqueBrands.forEach(brand => {
                const safeBrand = escapeHtml(brand);
                datalist.innerHTML += `<option value="${safeBrand}">`;
                const isActive = currentBrandFilter === brand ? 'active' : '';
                filterContainer.innerHTML += `<button class="brand-btn ${isActive}" onclick="filterMerek('${safeBrand}', this)">${safeBrand}</button>`;
                const isSelected = currentKasirVal === brand ? 'selected' : '';
                kasirSelect.innerHTML += `<option value="${safeBrand}" ${isSelected}>${safeBrand}</option>`;
            });
        }

        function kalkulasiModal() {
            const hrgSupp = parseRp(document.getElementById('brgHargaSupp').value);
            const d1 = Number(document.getElementById('brgDiskon1').value) || 0;
            const d2 = Number(document.getElementById('brgDiskon2').value) || 0;
            const d3 = Number(document.getElementById('brgDiskon3').value) || 0;

            const modal = hitungModalAkhir(hrgSupp, d1, d2, d3);
            document.getElementById('brgModalAkhir').value = formatRp(modal);

            const jual = parseRp(document.getElementById('brgJual').value);
            const untung = jual - modal;
            document.getElementById('brgUntung').value = jual > 0 ? formatRp(untung) : '0';
        }

        function editBarang(id) {
            const item = db.inventory.find(i => i.id === id);
            if(!item) return;

            currentEditId = id;
            document.getElementById('brgMerek').value = item.merek;
            document.getElementById('brgNama').value = item.nama;
            document.getElementById('brgStok').value = item.stok;
            document.getElementById('brgHargaSupp').value = formatRp(item.hargaSupp);
            
            document.getElementById('brgDiskon1').value = item.diskon1 !== undefined ? item.diskon1 : (item.diskonSupp || 0);
            document.getElementById('brgDiskon2').value = item.diskon2 || 0;
            document.getElementById('brgDiskon3').value = item.diskon3 || 0;
            
            document.getElementById('brgJual').value = formatRp(item.jual);
            
            kalkulasiModal();
            
            const btnSimpan = document.getElementById('btnSimpanBarang');
            btnSimpan.innerText = "Simpan Perubahan";
            btnSimpan.classList.replace('btn-primary', 'btn-warning');
            document.getElementById('btnBatalEdit').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function batalEdit() {
            currentEditId = null;
            const btnSimpan = document.getElementById('btnSimpanBarang');
            btnSimpan.innerText = "Simpan ke Database";
            btnSimpan.classList.replace('btn-warning', 'btn-primary');
            document.getElementById('btnBatalEdit').style.display = 'none';
            clearFormStok();
        }

        async function simpanBarang() {
            const merek = document.getElementById('brgMerek').value.trim().toUpperCase(); 
            const nama = document.getElementById('brgNama').value.trim();
            const stok = Number(document.getElementById('brgStok').value);
            const hargaSupp = parseRp(document.getElementById('brgHargaSupp').value);
            
            const d1 = Number(document.getElementById('brgDiskon1').value) || 0;
            const d2 = Number(document.getElementById('brgDiskon2').value) || 0;
            const d3 = Number(document.getElementById('brgDiskon3').value) || 0;

            const modalAkhir = hitungModalAkhir(hargaSupp, d1, d2, d3);

            const jual = parseRp(document.getElementById('brgJual').value);

            if(!merek || !nama || modalAkhir < 0 || jual <= 0) return showAlert("Cek kembali input merek, nama, dan harga!");

            let targetId;
            if (currentEditId) {
                targetId = currentEditId;
            } else {
                const existing = db.inventory.find(i => i.nama.toLowerCase() === nama.toLowerCase() && i.merek === merek);
                targetId = existing ? existing.id : Date.now();
            }
            const newItem = { id: targetId, merek, nama, stok, hargaSupp, diskon1: d1, diskon2: d2, diskon3: d3, modalAkhir, jual };

            const btnSimpan = document.getElementById('btnSimpanBarang');
            const originalLabel = btnSimpan.innerText;
            btnSimpan.disabled = true; btnSimpan.innerText = 'Menyimpan...';

            const { error } = await sb.from('products').upsert(productToRow(newItem));

            btnSimpan.disabled = false; btnSimpan.innerText = originalLabel;
            if (error) return showAlert('Gagal menyimpan ke database: ' + error.message);

            const index = db.inventory.findIndex(i => i.id === targetId);
            if (index >= 0) db.inventory[index] = newItem; else db.inventory.push(newItem);

            updateMerekDinamis(); renderStok(); batalEdit();
        }

        function clearFormStok() {
            ['brgMerek', 'brgNama','brgHargaSupp','brgModalAkhir','brgJual', 'brgUntung'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('brgDiskon1').value = '0';
            document.getElementById('brgDiskon2').value = '0';
            document.getElementById('brgDiskon3').value = '0';
            document.getElementById('brgStok').value = '1';
        }

        async function hapusBarang(id) {
            if(!await showConfirm("Yakin hapus barang ini permanen?")) return;
            const { error } = await sb.from('products').delete().eq('id', id);
            if (error) return showAlert('Gagal menghapus dari database: ' + error.message);
            db.inventory = db.inventory.filter(i => i.id !== id);
            updateMerekDinamis(); renderStok();
        }

        function filterMerek(merek, btn) {
            document.querySelectorAll('.brand-btn').forEach(b => b.classList.remove('active'));
            if(btn) btn.classList.add('active');
            currentBrandFilter = merek; renderStok();
        }

        function renderStok() {
            const tbody = document.getElementById('tabelStok'); tbody.innerHTML = '';
            
            const searchVal = document.getElementById('cariStok') ? document.getElementById('cariStok').value.toLowerCase() : '';

            db.inventory.forEach(item => {
                const matchMerek = (currentBrandFilter === 'SEMUA' || item.merek === currentBrandFilter);
                const matchSearch = (item.nama.toLowerCase().includes(searchVal) || item.merek.toLowerCase().includes(searchVal));

                if(matchMerek && matchSearch) {
                    const badgeColor = item.merek === 'TOTO' ? '#0369a1' : item.merek === 'WASSER' ? '#0f766e' : '#475569';
                    
                    let d1 = item.diskon1 !== undefined ? item.diskon1 : (item.diskonSupp || 0);
                    let d2 = item.diskon2 || 0;
                    let d3 = item.diskon3 || 0;
                    let discFormat = d1 + '%';
                    if(d2 > 0) discFormat += ' + ' + d2 + '%';
                    if(d3 > 0) discFormat += ' + ' + d3 + '%';

                    const untung = item.jual - item.modalAkhir;

                    tbody.innerHTML += `<tr>
                        <td><span class="badge" style="background:${badgeColor}; font-size:12px;">${escapeHtml(item.merek)}</span></td>
                        <td><strong>${escapeHtml(item.nama)}</strong></td>
                        <td style="font-weight:bold; text-align:center;">${item.stok}</td>
                        <td>Rp ${formatRp(item.hargaSupp)}</td>
                        <td style="text-align:center;">${discFormat}</td>
                        <td style="color:var(--warning); font-weight:bold;">Rp ${formatRp(item.modalAkhir)}</td>
                        <td style="color:var(--accent); font-weight:bold;">Rp ${formatRp(item.jual)}</td>
                        <td style="color:var(--accent); font-weight:900;">Rp ${formatRp(untung)}</td>
                        <td style="white-space: nowrap;">
                            <button class="btn btn-warning" style="margin-right: 5px;" onclick="editBarang(${item.id})">Edit</button>
                            <button class="btn btn-danger" onclick="hapusBarang(${item.id})">Hapus</button>
                        </td>
                    </tr>`;
                }
            });
        }

        function renderListKasir() {
            const search = document.getElementById('cariKasir').value.toLowerCase();
            const filterMerek = document.getElementById('filterMerekKasir').value;
            const tbody = document.getElementById('listBarangKasir');
            tbody.innerHTML = '';
            db.inventory.forEach(item => {
                const matchMerek = (filterMerek === 'SEMUA' || item.merek === filterMerek);
                const matchSearch = (item.nama.toLowerCase().includes(search) || item.merek.toLowerCase().includes(search));
                if(item.stok > 0 && matchMerek && matchSearch) {
                    tbody.innerHTML += `<tr>
                        <td><small style="color:#64748b">[${escapeHtml(item.merek)}]</small><br><strong>${escapeHtml(item.nama)}</strong><br><small>Stok: ${item.stok}</small></td>
                        <td class="text-right" style="font-weight:bold; color:var(--accent);">Rp ${formatRp(item.jual)}</td>
                        <td style="text-align:right;"><button class="btn btn-primary" onclick="tambahKeKeranjang(${item.id})">Tambah</button></td>
                    </tr>`;
                }
            });
        }

        function tambahKeKeranjang(id) {
            const item = db.inventory.find(i => i.id === id);
            const cartItem = cart.find(c => c.id === id);
            if(cartItem) {
                if(cartItem.qty >= item.stok) return showAlert("Peringatan: Stok kurang!");
                cartItem.qty++;
            } else cart.push({ ...item, qty: 1 });
            renderKeranjang();
        }

        function ubahQty(id, delta) {
            const index = cart.findIndex(c => c.id === id);
            const item = db.inventory.find(i => i.id === id);
            cart[index].qty += delta;
            if(cart[index].qty > item.stok) cart[index].qty = item.stok; 
            if(cart[index].qty <= 0) cart.splice(index, 1);
            renderKeranjang();
        }

        function renderKeranjang() {
            const tbody = document.getElementById('tabelKeranjang'); tbody.innerHTML = '';
            let total = 0;
            cart.forEach(c => {
                const subtotal = c.jual * c.qty; total += subtotal;
                tbody.innerHTML += `<tr>
                    <td><small>[${escapeHtml(c.merek)}]</small> ${escapeHtml(c.nama)}</td>
                    <td style="white-space:nowrap;"><button onclick="ubahQty(${c.id}, -1)">-</button> ${c.qty} <button onclick="ubahQty(${c.id}, 1)">+</button></td>
                    <td style="font-weight:bold;">Rp ${formatRp(subtotal)}</td>
                    <td><button class="btn btn-danger" onclick="ubahQty(${c.id}, -999)">X</button></td>
                </tr>`;
            });
            document.getElementById('totalBelanja').innerText = `Rp ${formatRp(total)}`;
            hitungKembalian();
        }

        function hitungKembalian() {
            const total = cart.reduce((sum, c) => sum + (c.jual * c.qty), 0);
            const bayar = parseRp(document.getElementById('uangBayar').value);
            const status = document.getElementById('statusBayar').value;
            
            const lblKembali = document.getElementById('lblKembali');
            const txtKembalian = document.getElementById('kembalian');

            if(status === 'LUNAS') {
                lblKembali.innerText = 'Kembali';
                txtKembalian.innerText = bayar >= total ? `Rp ${formatRp(bayar - total)}` : 'Rp 0';
                txtKembalian.style.color = 'var(--accent)';
            } else {
                lblKembali.innerText = 'Sisa Bon / Kurang';
                txtKembalian.innerText = bayar < total ? `Rp ${formatRp(total - bayar)}` : 'Rp 0';
                txtKembalian.style.color = 'var(--danger)';
            }
        }

        async function prosesTransaksi() {
            if(cart.length === 0) return showAlert("Keranjang kosong!");

            const customer = document.getElementById('namaCustomer').value.trim();
            const uangBayar = parseRp(document.getElementById('uangBayar').value);
            let status = document.getElementById('statusBayar').value;

            if(status === 'HUTANG' && !customer) return showAlert("WAJIB mengisi Nama Customer jika mengutang / kas bon!");

            for (const c of cart) {
                const invItem = db.inventory.find(i => i.id === c.id);
                if (!invItem || c.qty > invItem.stok) return showAlert(`Stok "${c.nama}" tidak cukup!`);
            }

            let totalModal = 0, totalPemasukan = 0;
            cart.forEach(c => { totalModal += (c.modalAkhir * c.qty); totalPemasukan += (c.jual * c.qty); });

            let sisaHutang = 0;
            if(status === 'HUTANG') {
                if(uangBayar >= totalPemasukan) {
                    showAlert("Uang pembayaran mencukupi, status otomatis dialihkan menjadi LUNAS.");
                    status = 'LUNAS';
                } else {
                    sisaHutang = totalPemasukan - uangBayar;
                }
            }

            const notaId = 'INV-' + Date.now();
            const transaksi = {
                id: notaId, tgl: new Date().toISOString(), customer: customer || 'Tunai',
                items: [...cart], totalModal, totalPemasukan, status, dibayar: uangBayar, sisaHutang
            };

            const btnBayar = document.querySelector('#kasir .btn-success');
            if (btnBayar) { btnBayar.disabled = true; btnBayar.innerText = 'Menyimpan...'; }

            const { error: rpcErr } = await sb.rpc('process_sale', {
                p_sale: saleToRow(transaksi),
                p_items: cart.map(c => ({ id: c.id, qty: c.qty }))
            });

            if (rpcErr) {
                if (btnBayar) { btnBayar.disabled = false; btnBayar.innerText = 'Cetak Struk & Simpan'; }
                return showAlert('Transaksi GAGAL disimpan (tidak ada yang berubah di database): ' + rpcErr.message);
            }

            cart.forEach(c => {
                const invItem = db.inventory.find(i => i.id === c.id);
                if (invItem) invItem.stok -= c.qty;
            });

            db.sales.push(transaksi);
            if (btnBayar) { btnBayar.disabled = false; btnBayar.innerText = 'Cetak Struk & Simpan'; }
            cetakStrukThermal(transaksi);

            cart = []; renderKeranjang(); renderListKasir(); renderStok();
            document.getElementById('uangBayar').value = '';
            document.getElementById('namaCustomer').value = '';
            hitungKembalian();
        }

        function buatHTMLStruk(tx, isCopy) {
            let infoHutang = '';
            if(tx.status === 'HUTANG') {
                infoHutang = `
                    <tr><td colspan="2" class="t-right">DIBAYAR:</td><td class="t-right fw-bold">Rp ${formatRp(tx.dibayar)}</td></tr>
                    <tr><td colspan="2" class="t-right">SISA HUTANG:</td><td class="t-right fw-bold" style="color:red;">Rp ${formatRp(tx.sisaHutang)}</td></tr>
                `;
            } else {
                const kembali = tx.dibayar >= tx.totalPemasukan ? tx.dibayar - tx.totalPemasukan : 0;
                infoHutang = `
                    <tr><td colspan="2" class="t-right">TUNAI:</td><td class="t-right">Rp ${formatRp(tx.dibayar)}</td></tr>
                    <tr><td colspan="2" class="t-right">KEMBALI:</td><td class="t-right fw-bold">Rp ${formatRp(kembali)}</td></tr>
                `;
            }

            const watermarkHTML = isCopy ? '<div class="watermark-copy">COPY</div>' : '';
            const statusLabel = tx.status === 'HUTANG' ? '(BON)' : '';

            let html = `
                <div class="receipt-wrapper">
                    ${watermarkHTML}
                    <div class="header-thermal t-center">
                        <h2>ACON</h2>
                        <div class="divider"></div>
                    </div>
                    <div style="font-size: 11px;">
                        <table style="width: 100%;">
                            <tr><td class="t-left">Tgl: ${formatTgl(tx.tgl)}</td></tr>
                            <tr><td class="t-left">No: ${tx.id}</td></tr>
                            <tr><td class="t-left">Cust: ${escapeHtml(tx.customer)} ${statusLabel}</td></tr>
                        </table>
                    </div>
                    <div class="divider"></div>
                    <table class="table-thermal">
            `;
            
            tx.items.forEach(c => {
                html += `
                        <tr><td colspan="3"><span class="nota-item-name">${escapeHtml(c.merek)} - ${escapeHtml(c.nama)}</span></td></tr>
                        <tr>
                            <td class="t-left">${c.qty}x</td>
                            <td class="t-left">Rp${formatRp(c.jual)}</td>
                            <td class="t-right">Rp${formatRp(c.jual * c.qty)}</td>
                        </tr>
                `;
            });
            
            html += `
                    </table>
                    <div class="divider"></div>
                    <table class="table-thermal">
                        <tr><td colspan="2" class="t-right fw-bold">TOTAL:</td><td class="t-right fw-bold">Rp ${formatRp(tx.totalPemasukan)}</td></tr>
                        ${infoHutang}
                    </table>
                    <div class="divider"></div>
                    <div class="t-center" style="margin-top: 10px; font-size: 11px;">
                        <p>Terima Kasih Atas Kunjungan Anda</p>
                        <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan.</p>
                    </div>
                </div>
            `;
            return html;
        }

        function cetakStrukThermal(tx) {
            let cetakanLengkap = '';
            
            if(tx.status === 'HUTANG') {
                cetakanLengkap += buatHTMLStruk(tx, true); 
                cetakanLengkap += '<div class="page-break"></div>';
                cetakanLengkap += buatHTMLStruk(tx, true); 
                cetakanLengkap += '<div class="page-break"></div>';
                cetakanLengkap += buatHTMLStruk(tx, false); 
            } else {
                cetakanLengkap += buatHTMLStruk(tx, true); 
                cetakanLengkap += '<div class="page-break"></div>';
                cetakanLengkap += buatHTMLStruk(tx, false); 
            }

            document.getElementById('printArea').innerHTML = cetakanLengkap;
            document.getElementById('printArea').style.display = 'block'; 
            window.print();
            document.getElementById('printArea').style.display = 'none'; 
        }

        function renderKasBon() {
            const tbody = document.getElementById('tabelHutang'); tbody.innerHTML = '';
            const listHutang = db.sales.filter(s => s.status === 'HUTANG').slice().reverse();
            
            if(listHutang.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8;">Tidak ada pelanggan yang kas bon saat ini.</td></tr>`;
                return;
            }

            listHutang.forEach(s => {
                tbody.innerHTML += `<tr>
                    <td>${s.id}</td><td><strong>${escapeHtml(s.customer)}</strong></td><td>${formatTgl(s.tgl)}</td>
                    <td>Rp ${formatRp(s.totalPemasukan)}</td>
                    <td style="color:var(--danger); font-weight:bold;">Rp ${formatRp(s.sisaHutang)}</td>
                    <td><button class="btn btn-warning" onclick="bayarCicilan('${s.id}')">Bayar / Cicil</button></td>
                </tr>`;
            });
        }

        async function bayarCicilan(notaId) {
            const tx = db.sales.find(s => s.id === notaId);
            if(!tx) return;

            const val = await showPrompt(`PEMBAYARAN KAS BON\nNota: ${notaId}\nCustomer: ${tx.customer}\nSisa Hutang: Rp ${formatRp(tx.sisaHutang)}\n\nMasukkan nominal yang dibayar (Angka Saja):`);
            if(!val) return;

            const bayar = Number(val.replace(/[^0-9]/g, ''));
            if(bayar <= 0) return showAlert('Nominal tidak valid!');
            if(bayar > tx.sisaHutang) return showAlert('Pembayaran melebihi sisa hutang (kembalian tidak dihitung sistem). Harap masukkan pas!');

            const newSisaHutang = tx.sisaHutang - bayar;
            const newDibayar = tx.dibayar + bayar;
            const newStatus = newSisaHutang <= 0 ? 'LUNAS' : 'HUTANG';
            const finalSisa = newStatus === 'LUNAS' ? 0 : newSisaHutang;

            const { error } = await sb.from('sales').update({ sisa_hutang: finalSisa, dibayar: newDibayar, status: newStatus }).eq('id', notaId);
            if (error) return showAlert('Gagal menyimpan pembayaran ke database: ' + error.message);

            tx.sisaHutang = finalSisa;
            tx.dibayar = newDibayar;
            tx.status = newStatus;

            if(newStatus === 'LUNAS') {
                showAlert('Pembayaran sukses! Hutang telah LUNAS sepenuhnya.');
            } else {
                showAlert(`Pembayaran masuk! Sisa hutang sekarang: Rp ${formatRp(tx.sisaHutang)}`);
            }

            renderKasBon();
            if(document.getElementById('riwayat').classList.contains('active')) renderRiwayat();
            if(document.getElementById('laporan').classList.contains('active')) renderLaporan();
        }

        function resetFilterRiwayat() {
            document.getElementById('filterRiwayatAwal').value = '';
            document.getElementById('filterRiwayatAkhir').value = '';
            renderRiwayat(true);
        }

        function renderRiwayat(showAll = false) {
            const startStr = document.getElementById('filterRiwayatAwal').value;
            const endStr = document.getElementById('filterRiwayatAkhir').value;
            const tbody = document.getElementById('tabelRiwayat'); tbody.innerHTML = '';
            
            let filtered = db.sales.slice().reverse();

            if (!showAll) {
                if (startStr && endStr) {
                    const startDate = new Date(startStr).setHours(0,0,0,0);
                    const endDate = new Date(endStr).setHours(23,59,59,999);
                    filtered = filtered.filter(s => {
                        const time = new Date(s.tgl).getTime();
                        return time >= startDate && time <= endDate;
                    });
                } else if (startStr && !endStr) {
                    const startDate = new Date(startStr).setHours(0,0,0,0);
                    const endDate = new Date(startStr).setHours(23,59,59,999);
                    filtered = filtered.filter(s => {
                        const time = new Date(s.tgl).getTime();
                        return time >= startDate && time <= endDate;
                    });
                } else {
                    filtered = []; 
                }
            }

            if(filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#94a3b8; font-style:italic;">Tidak ada data pada tanggal terpilih.</td></tr>`;
                return;
            }

            filtered.forEach(s => {
                const badge = s.status === 'HUTANG' ? `<span class="badge" style="background:var(--danger)">BON</span>` : `<span class="badge" style="background:var(--accent)">LUNAS</span>`;
                tbody.innerHTML += `<tr>
                    <td>${s.id} <br>${badge}</td><td>${escapeHtml(s.customer)}</td><td>${formatTgl(s.tgl)}</td>
                    <td>${s.items.length} macam</td><td>Rp ${formatRp(s.totalPemasukan)}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-warning" style="margin-right: 5px; padding: 6px 12px; font-size:12px;" onclick="lihatNota('${s.id}')">Lihat</button>
                        <button class="btn btn-primary" style="padding: 6px 12px; font-size:12px;" onclick="printUlang('${s.id}')">Print</button>
                    </td>
                </tr>`;
            });
        }
        function printUlang(id) { const tx = db.sales.find(s => s.id === id); if(tx) cetakStrukThermal(tx); }

        function lihatNota(id) {
            const tx = db.sales.find(s => s.id === id);
            if(!tx) return;
            
            let html = `
                <div style="margin-bottom:15px;">
                    <p><strong>No Nota:</strong> ${tx.id}</p>
                    <p><strong>Tanggal:</strong> ${formatTgl(tx.tgl)}</p>
                    <p><strong>Customer:</strong> ${escapeHtml(tx.customer)}</p>
                    <p><strong>Status:</strong> <span class="badge" style="background:${tx.status==='HUTANG'?'var(--danger)':'var(--accent)'}">${tx.status}</span></p>
                </div>
                <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin-bottom: 10px;">
                <table style="width: 100%; font-size: 13px;">
                    <thead><tr><th style="padding:5px; background:none; color:black;">Barang</th><th style="text-align:center; padding:5px; background:none; color:black;">Qty</th><th style="text-align:right; padding:5px; background:none; color:black;">Subtotal</th></tr></thead>
                    <tbody>
            `;
            
            tx.items.forEach(c => {
                html += `<tr><td style="padding:5px; border:none; border-bottom:1px solid #eee;">${escapeHtml(c.merek)} - ${escapeHtml(c.nama)}</td><td style="text-align:center; padding:5px; border:none; border-bottom:1px solid #eee;">${c.qty}</td><td style="text-align:right; padding:5px; border:none; border-bottom:1px solid #eee;">Rp ${formatRp(c.jual * c.qty)}</td></tr>`;
            });
            
            html += `
                    </tbody>
                </table>
                <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin-top: 10px; margin-bottom: 10px;">
                <div style="text-align:right; font-size: 14px;">
                    <p style="margin-bottom:4px;"><strong>Total Belanja:</strong> Rp ${formatRp(tx.totalPemasukan)}</p>
                    <p style="margin-bottom:4px;"><strong>Dibayar:</strong> Rp ${formatRp(tx.dibayar)}</p>
                    ${tx.status === 'HUTANG' ? `<p style="color:var(--danger); font-size: 16px;"><strong>Sisa Hutang:</strong> Rp ${formatRp(tx.sisaHutang)}</p>` : ''}
                </div>
            `;
            
            document.getElementById('notaDetailContent').innerHTML = html;
            document.getElementById('viewNotaModal').style.display = 'flex';
        }

        function closeNotaModal() {
            document.getElementById('viewNotaModal').style.display = 'none';
        }

        let returTargetNota = null;
        function cariNotaUntukRetur() {
            const notaId = document.getElementById('cariNotaRetur').value.trim();
            returTargetNota = db.sales.find(s => s.id === notaId);
            if(!returTargetNota) return showAlert("Nota tidak ditemukan!");
            
            document.getElementById('areaRetur').style.display = 'block';
            document.getElementById('lblIdNota').innerText = returTargetNota.id;
            
            const tbody = document.getElementById('tabelItemRetur'); tbody.innerHTML = '';
            returTargetNota.items.forEach((item, index) => {
                tbody.innerHTML += `<tr>
                    <td>${escapeHtml(item.merek)} - ${escapeHtml(item.nama)}</td><td>${item.qty}</td><td>Rp ${formatRp(item.jual)}</td>
                    <td><input type="number" id="returQty_${index}" max="${item.qty}" min="0" value="0" style="width:70px;"></td>
                    <td><button class="btn btn-warning" onclick="prosesReturItem(${index})">Proses Retur</button></td>
                </tr>`;
            });
        }
        async function prosesReturItem(itemIndex) {
            const qtyRetur = Number(document.getElementById(`returQty_${itemIndex}`).value);
            const item = returTargetNota.items[itemIndex];

            if(qtyRetur <= 0 || qtyRetur > item.qty) return showAlert("Jumlah retur tidak valid!");
            if(!await showConfirm(`Yakin meretur ${qtyRetur}x ${item.nama}?`)) return;

            const nilaiRetur = qtyRetur * item.jual;
            const modalRetur = qtyRetur * item.modalAkhir;
            const returnRow = { id: Date.now(), tgl: new Date().toISOString(), notaId: returTargetNota.id, namaBarang: item.nama, qty: qtyRetur, nilaiDikembalikan: nilaiRetur, modalDikembalikan: modalRetur };

            const { error: retErr } = await sb.from('returns').insert(returnToRow(returnRow));
            if (retErr) return showAlert('Gagal menyimpan retur ke database: ' + retErr.message);

            const invItem = db.inventory.find(i => i.id === item.id);
            if (invItem) {
                const newStok = invItem.stok + qtyRetur;
                const { error: stokErr } = await sb.from('products').update({ stok: newStok }).eq('id', invItem.id);
                if (stokErr) showAlert('Peringatan: retur tersimpan, tapi stok gagal diupdate: ' + stokErr.message);
                else invItem.stok = newStok;
            }

            const newTotalPemasukan = returTargetNota.totalPemasukan - nilaiRetur;
            const newTotalModal = returTargetNota.totalModal - modalRetur;
            let newSisaHutang = returTargetNota.sisaHutang;
            let newStatus = returTargetNota.status;
            if (returTargetNota.status === 'HUTANG') {
                newSisaHutang -= nilaiRetur;
                if (newSisaHutang <= 0) { newStatus = 'LUNAS'; newSisaHutang = 0; }
            }
            const { error: saleErr } = await sb.from('sales').update({ total_pemasukan: newTotalPemasukan, total_modal: newTotalModal, sisa_hutang: newSisaHutang, status: newStatus }).eq('id', returTargetNota.id);
            if (saleErr) showAlert('Peringatan: retur tersimpan, tapi transaksi asal gagal terupdate: ' + saleErr.message);

            db.returns.push(returnRow);
            item.qty -= qtyRetur;
            returTargetNota.totalPemasukan = newTotalPemasukan;
            returTargetNota.totalModal = newTotalModal;
            returTargetNota.sisaHutang = newSisaHutang;
            returTargetNota.status = newStatus;

            showAlert("Retur sukses!"); cariNotaUntukRetur(); renderStok();
        }

        function resetFilterPengeluaran() {
            document.getElementById('filterPengeluaranAwal').value = '';
            document.getElementById('filterPengeluaranAkhir').value = '';
            renderPengeluaran(true); 
        }

        async function simpanPengeluaran() {
            const tgl = document.getElementById('tglKeluar').value;
            const ket = document.getElementById('ketKeluar').value;
            const nom = parseRp(document.getElementById('nomKeluar').value);
            if(!tgl || !ket || nom <= 0) return showAlert("Lengkapi data!");

            const expense = { id: Date.now(), tgl: new Date(tgl).toISOString(), ket, nominal: nom };
            const { error } = await sb.from('expenses').insert(expenseToRow(expense));
            if (error) return showAlert('Gagal menyimpan ke database: ' + error.message);

            db.expenses.push(expense);
            document.getElementById('ketKeluar').value = '';
            document.getElementById('nomKeluar').value = '';
            showAlert('Tersimpan!');

            document.getElementById('filterPengeluaranAwal').valueAsDate = new Date();
            document.getElementById('filterPengeluaranAkhir').valueAsDate = new Date();
            renderPengeluaran();
        }

        function renderPengeluaran(showAll = false) {
            const startStr = document.getElementById('filterPengeluaranAwal').value;
            const endStr = document.getElementById('filterPengeluaranAkhir').value;
            const tbody = document.getElementById('tabelPengeluaran'); tbody.innerHTML = '';
            
            let filtered = db.expenses.slice().reverse();

            if (!showAll) {
                if(startStr && endStr) {
                    const startDate = new Date(startStr).setHours(0,0,0,0);
                    const endDate = new Date(endStr).setHours(23,59,59,999);
                    filtered = filtered.filter(e => {
                        const time = new Date(e.tgl).getTime();
                        return time >= startDate && time <= endDate;
                    });
                } else if(startStr && !endStr) {
                    const startDate = new Date(startStr).setHours(0,0,0,0);
                    const endDate = new Date(startStr).setHours(23,59,59,999);
                    filtered = filtered.filter(e => {
                        const time = new Date(e.tgl).getTime();
                        return time >= startDate && time <= endDate;
                    });
                } else {
                    filtered = [];
                }
            }

            if(filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#94a3b8; font-style:italic;">Tidak ada pengeluaran pada tanggal terpilih.</td></tr>`;
                return;
            }

            filtered.forEach(e => { 
                tbody.innerHTML += `<tr><td>${formatTgl(e.tgl)}</td><td>${escapeHtml(e.ket)}</td><td>Rp ${formatRp(e.nominal)}</td></tr>`; 
            });
        }

        function renderLaporan() {
            const startStr = document.getElementById('lapTglAwal').value;
            const endStr = document.getElementById('lapTglAkhir').value;
            if(!startStr || !endStr) return showAlert("Pilih tanggal awal dan akhir!");
            
            const startDate = new Date(startStr).setHours(0,0,0,0);
            const endDate = new Date(endStr).setHours(23,59,59,999);
            
            let omset = 0, hpp = 0, expense = 0, totalRetur = 0, piutang = 0;
            
            db.sales.forEach(s => {
                const time = new Date(s.tgl).getTime();
                if(time >= startDate && time <= endDate) { 
                    omset += s.totalPemasukan; 
                    hpp += s.totalModal; 
                    if(s.status === 'HUTANG') piutang += s.sisaHutang; 
                }
            });
            
            db.expenses.forEach(e => {
                const time = new Date(e.tgl).getTime();
                if(time >= startDate && time <= endDate) expense += e.nominal; 
            });

            db.returns.forEach(r => {
                const time = new Date(r.tgl).getTime();
                if(time >= startDate && time <= endDate) { totalRetur += r.nilaiDikembalikan; }
            });

            const profitBersih = (omset - hpp) - expense;

            document.getElementById('lapPemasukan').innerText = `Rp ${formatRp(omset)}`;
            document.getElementById('lapPiutang').innerText = `Rp ${formatRp(piutang)}`;
            document.getElementById('lapPengeluaran').innerHTML = `Rp ${formatRp(expense)} <br><span style="font-size:12px; color:#64748b;">(+ Retur: Rp ${formatRp(totalRetur)})</span>`;
            document.getElementById('lapLaba').innerText = `Rp ${formatRp(profitBersih)}`;
        }

        async function initApp() {
            const loadingEl = document.getElementById('loadingOverlay');
            try {
                await loadAllData();
            } catch (err) {
                if (loadingEl) {
                    loadingEl.innerHTML = `<div style="text-align:center; padding:20px;">
                        <p style="font-weight:bold; color:#dc2626;">Gagal memuat data dari database.</p>
                        <p style="font-size:13px; margin-top:8px;">${err.message || err}</p>
                        <p style="font-size:12px; margin-top:8px; color:#64748b;">Cek lagi SUPABASE_URL & SUPABASE_ANON_KEY di script.js, dan pastikan tabel sudah dibuat.</p>
                    </div>`;
                }
                return;
            }

            document.getElementById('filterRiwayatAwal').valueAsDate = new Date();
            document.getElementById('filterRiwayatAkhir').valueAsDate = new Date();
            document.getElementById('filterPengeluaranAwal').valueAsDate = new Date();
            document.getElementById('filterPengeluaranAkhir').valueAsDate = new Date();
            document.getElementById('tglKeluar').valueAsDate = new Date();

            updateMerekDinamis(); renderStok(); renderPengeluaran(); renderRiwayat(); renderKasBon();

            if (loadingEl) loadingEl.style.display = 'none';
        }

        initApp();
