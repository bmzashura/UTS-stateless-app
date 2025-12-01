// ============================================
// TASK MANAGEMENT DASHBOARD - VUE 3 APP
// Aplikasi manajemen tugas dengan Composition API
// ============================================

// Import fungsi-fungsi Vue 3 dari CDN
const { createApp, ref, reactive, computed, watchEffect } = Vue;

// Inisialisasi aplikasi Vue
createApp({
    setup() {
        // ============================================
        // STATE MANAGEMENT - Reactive Data
        // ============================================
        
        // Tab navigasi saat ini (tasks atau pics)
        const currentTab = ref('tasks');
        
        // Array untuk menyimpan daftar Person In Contact (PIC)
        const pictures = ref([]);
        
        // Array untuk menyimpan daftar Task
        const tasks = ref([]);
        
        // Flag untuk menampilkan/menyembunyikan modal task
        const showTaskModal = ref(false);
        
        // Flag untuk menampilkan/menyembunyikan modal PIC
        const showPicModal = ref(false);
        
        // ID task yang sedang diubah (null jika membuat baru)
        const editingTaskId = ref(null);
        
        // ID PIC yang sedang diubah (null jika membuat baru)
        const editingPicId = ref(null);

        // ============================================
        // FORM STATE - Data Bentuk Input
        // ============================================
        
        // State untuk form input task baru/edit
        const taskForm = reactive({
            title: '',              // Judul task
            description: '',        // Deskripsi detail
            status: 'Belum Dimulai',// Status: Belum Dimulai, Sedang Dikerjakan, atau Selesai
            assignedPics: []        // Array ID PIC yang ditugaskan
        });

        // State untuk form input PIC baru/edit
        const picForm = reactive({
            name: '',              // Nama PIC
            role: ''               // Posisi/Role PIC
        });

        // ============================================
        // STORAGE HELPERS - IndexedDB + localStorage
        // Menyimpan ke IndexedDB agar data tetap ada setelah refresh/close
        // ============================================

        // Buka atau buat database IndexedDB sederhana
        const openIDB = () => {
            return new Promise((resolve, reject) => {
                if (!window.indexedDB) return reject(new Error('IndexedDB tidak tersedia'));
                const req = indexedDB.open('tcelflow-db', 1);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains('kv')) {
                        db.createObjectStore('kv');
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        };

        const idbSet = async (key, value) => {
            try {
                const db = await openIDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction('kv', 'readwrite');
                    const store = tx.objectStore('kv');
                    const req = store.put(value, key);
                    req.onsuccess = () => {
                        resolve(true);
                        db.close();
                    };
                    req.onerror = () => {
                        reject(req.error);
                        db.close();
                    };
                });
            } catch (e) {
                console.warn('idbSet gagal:', e);
                throw e;
            }
        };

        const idbGet = async (key) => {
            try {
                const db = await openIDB();
                return new Promise((resolve, reject) => {
                    const tx = db.transaction('kv', 'readonly');
                    const store = tx.objectStore('kv');
                    const req = store.get(key);
                    req.onsuccess = () => {
                        resolve(req.result);
                        db.close();
                    };
                    req.onerror = () => {
                        reject(req.error);
                        db.close();
                    };
                });
            } catch (e) {
                console.warn('idbGet gagal:', e);
                return null;
            }
        };

        // Memuat data dari IndexedDB jika tersedia, fallback ke localStorage
        const loadFromStorage = async () => {
            // Coba ambil dari IndexedDB
            const idbPics = await idbGet('pics').catch(() => null);
            const idbTasks = await idbGet('tasks').catch(() => null);

            if (idbPics && Array.isArray(idbPics)) {
                pictures.value = idbPics;
            } else {
                const storedPics = localStorage.getItem('pics');
                if (storedPics) {
                    try {
                        pictures.value = JSON.parse(storedPics);
                    } catch (e) {
                        console.error('Gagal memuat data PIC dari localStorage:', e);
                    }
                }
            }

            if (idbTasks && Array.isArray(idbTasks)) {
                tasks.value = idbTasks;
            } else {
                const storedTasks = localStorage.getItem('tasks');
                if (storedTasks) {
                    try {
                        tasks.value = JSON.parse(storedTasks);
                    } catch (e) {
                        console.error('Gagal memuat data Task dari localStorage:', e);
                    }
                }
            }
        };

        // Menyimpan data ke localStorage dan IndexedDB (async)
        const saveToStorage = async () => {
            try {
                // Simpan lokal agar immediate available
                localStorage.setItem('pics', JSON.stringify(pictures.value));
                localStorage.setItem('tasks', JSON.stringify(tasks.value));

                // Simpan ke IndexedDB agar lebih tahan lama dan kapasitas lebih besar
                await idbSet('pics', pictures.value).catch(e => console.warn('idb save pics gagal', e));
                await idbSet('tasks', tasks.value).catch(e => console.warn('idb save tasks gagal', e));
            } catch (e) {
                console.error('Gagal menyimpan data ke storage:', e);
            }
        };

        // Gunakan watchEffect untuk memicu penyimpanan setiap ada perubahan
        // Panggilan saveToStorage asinkron tetapi tidak di-await untuk menjaga UI responsif
        watchEffect(() => {
            saveToStorage();
        });

        // ============================================
        // COMPUTED PROPERTIES - Filtered Data
        // ============================================
        
        // Computed property untuk mendapatkan semua task dengan status "Belum Dimulai"
        const getTodos = computed(() => tasks.value.filter(t => t.status === 'Belum Dimulai'));
        
        // Computed property untuk mendapatkan semua task dengan status "Sedang Dikerjakan"
        const getInProgress = computed(() => tasks.value.filter(t => t.status === 'Sedang Dikerjakan'));
        
        // Computed property untuk mendapatkan semua task dengan status "Selesai"
        const getDone = computed(() => tasks.value.filter(t => t.status === 'Selesai'));

        // Hitungan jumlah task dan pics untuk UI
        const tasksCount = computed(() => tasks.value.length);
        const picsCount = computed(() => pictures.value.length);

        // Notifications (toasts) - non-blocking user-friendly messages
        const notifications = ref([]);
        const notify = (message, type = 'success', timeout = 3500) => {
            try {
                const id = Date.now().toString() + Math.random().toString(36).slice(2, 8);
                notifications.value.push({ id, message, type });
                // Auto-dismiss
                setTimeout(() => {
                    notifications.value = notifications.value.filter(n => n.id !== id);
                }, timeout);
            } catch (e) {
                console.warn('Notify failed', e);
            }
        };
        const dismissNotification = (id) => {
            notifications.value = notifications.value.filter(n => n.id !== id);
        };
        
        // Custom non-blocking confirm dialog (promise-based)
        const confirmDialog = ref({ visible: false, title: '', message: '', _resolve: null });

        const showConfirm = (message, title = 'Konfirmasi') => {
            return new Promise((resolve) => {
                confirmDialog.value.title = title;
                confirmDialog.value.message = message;
                confirmDialog.value.visible = true;
                confirmDialog.value._resolve = resolve;
            });
        };

        const confirmDialogConfirm = () => {
            if (confirmDialog.value._resolve) confirmDialog.value._resolve(true);
            confirmDialog.value.visible = false;
            confirmDialog.value._resolve = null;
        };

        const confirmDialogCancel = () => {
            if (confirmDialog.value._resolve) confirmDialog.value._resolve(false);
            confirmDialog.value.visible = false;
            confirmDialog.value._resolve = null;
        };

        // Export semua data sebagai file JSON
        const exportData = () => {
            try {
                const payload = {
                    exportedAt: new Date().toISOString(),
                    tasks: tasks.value,
                    pics: pictures.value
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tcelflow-export-${new Date().toISOString()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                notify('Data berhasil diekspor — file sedang diunduh.', 'success');
            } catch (e) {
                console.error('Gagal mengekspor data:', e);
                notify('Gagal mengekspor data: ' + (e.message || e), 'error');
            }
        };

        // Import data dari file JSON yang di-export sebelumnya
        const importData = async (file) => {
            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Validasi struktur JSON
                if (!data.tasks || !Array.isArray(data.tasks)) {
                    throw new Error('Format JSON invalid: tidak ada array "tasks"');
                }
                if (!data.pics || !Array.isArray(data.pics)) {
                    throw new Error('Format JSON invalid: tidak ada array "pics"');
                }

                // Confirm sebelum overwrite (custom non-blocking dialog)
                const ok = await showConfirm(
                    `Import data dari ${new Date(data.exportedAt).toLocaleString()}?\nTugas: ${data.tasks.length}, Orang: ${data.pics.length}\n(Data lama akan ditimpa)`,
                    'Import Data'
                );

                if (!ok) return;

                // Restore data
                tasks.value = data.tasks;
                pictures.value = data.pics;

                // Simpan ke storage
                await saveToStorage();

                console.log('✅ Data berhasil diimport');
                notify('Data berhasil diimport!', 'success');
            } catch (e) {
                console.error('Gagal mengimport data:', e);
                notify('Gagal mengimport data: ' + (e.message || e), 'error');
            }
        };

        // Handle file import dari input file
        const handleFileImport = (event) => {
            const file = event.target.files[0];
            if (file) {
                importData(file);
                // Reset input untuk allow import file yang sama lagi
                event.target.value = '';
            }
        };

        // Ref untuk file input element
        const importFileInput = ref(null);

        // ============================================
        // HELPER FUNCTIONS
        // ============================================
        
        // Fungsi untuk mendapatkan nama PIC berdasarkan ID
        const getPicName = (picId) => {
            // Cari PIC dengan ID yang sesuai
            const pic = pictures.value.find(p => p.id === picId);
            // Return nama PIC atau "Unknown" jika tidak ditemukan
            return pic ? pic.name : 'Unknown';
        };

        // Fungsi untuk toggle assignment PIC ke task (add/remove)
        const togglePicAssignment = (picId) => {
            // Cari index PIC di array assignedPics
            const index = taskForm.assignedPics.indexOf(picId);
            // Jika sudah ada, hapus; jika belum ada, tambahkan
            if (index > -1) {
                taskForm.assignedPics.splice(index, 1);
            } else {
                taskForm.assignedPics.push(picId);
            }
        };

        // ============================================
        // TASK MODAL FUNCTIONS
        // ============================================
        
        // Fungsi untuk membuka modal task (untuk create/edit)
        const openTaskModal = (task = null) => {
            // Jika ada task yang dikirim, mode EDIT
            if (task) {
                editingTaskId.value = task.id;
                taskForm.title = task.title;
                taskForm.description = task.description;
                taskForm.status = task.status;
                // Copy array assignedPics agar tidak mengubah data original
                taskForm.assignedPics = [...task.assignedPics];
            } else {
                // Jika tidak ada task, mode CREATE (reset form)
                editingTaskId.value = null;
                taskForm.title = '';
                taskForm.description = '';
                taskForm.status = 'Belum Dimulai';
                taskForm.assignedPics = [];
            }
            // Tampilkan modal
            showTaskModal.value = true;
        };

        // Fungsi untuk menutup modal task
        const closeTaskModal = () => {
            // Sembunyikan modal
            showTaskModal.value = false;
            // Reset editing ID
            editingTaskId.value = null;
        };

        // Fungsi untuk menyimpan task (create atau update)
        const saveTask = () => {
            // Validasi: title tidak boleh kosong
            if (!taskForm.title.trim()) return;

            // Jika ada editingTaskId, berarti EDIT mode
            if (editingTaskId.value) {
                // Cari index task yang akan diubah
                const taskIndex = tasks.value.findIndex(t => t.id === editingTaskId.value);
                // Update task di array
                if (taskIndex > -1) {
                    tasks.value[taskIndex] = {
                        ...tasks.value[taskIndex],
                        title: taskForm.title,
                        description: taskForm.description,
                        status: taskForm.status,
                        assignedPics: [...taskForm.assignedPics]
                    };
                    // Notifikasi: berhasil edit
                    notify('Tugas berhasil diperbarui!', 'success');
                }
            } else {
                // CREATE mode - buat task baru
                const newTask = {
                    id: Date.now().toString(),  // Gunakan timestamp sebagai ID
                    title: taskForm.title,
                    description: taskForm.description,
                    status: taskForm.status,
                    assignedPics: [...taskForm.assignedPics],
                    createdAt: new Date().toISOString()
                };
                // Tambahkan task baru ke array
                tasks.value.push(newTask);
                // Notifikasi: berhasil tambah
                notify('Tugas berhasil ditambahkan!', 'success');
            }

            // Tutup modal setelah simpan
            closeTaskModal();
        };

        // Fungsi untuk menghapus task
        const deleteTask = async (taskId) => {
            const ok = await showConfirm('Apakah Anda yakin ingin menghapus task ini?', 'Hapus Tugas');
            if (!ok) return;
            tasks.value = tasks.value.filter(t => t.id !== taskId);
            notify('Tugas berhasil dihapus!', 'success');
        };

        // ============================================
        // PIC MODAL FUNCTIONS
        // ============================================
        
        // Fungsi untuk membuka modal PIC (untuk create/edit)
        const openPicModal = (pic = null) => {
            // Jika ada PIC yang dikirim, mode EDIT
            if (pic) {
                editingPicId.value = pic.id;
                picForm.name = pic.name;
                picForm.role = pic.role;
            } else {
                // Jika tidak ada PIC, mode CREATE (reset form)
                editingPicId.value = null;
                picForm.name = '';
                picForm.role = '';
            }
            // Tampilkan modal
            showPicModal.value = true;
        };

        // Fungsi untuk menutup modal PIC
        const closePicModal = () => {
            // Sembunyikan modal
            showPicModal.value = false;
            // Reset editing ID
            editingPicId.value = null;
        };

        // Fungsi untuk menyimpan PIC (create atau update)
        const savePic = () => {
            // Validasi: name dan role tidak boleh kosong
            if (!picForm.name.trim() || !picForm.role.trim()) return;

            // Jika ada editingPicId, berarti EDIT mode
            if (editingPicId.value) {
                // Cari index PIC yang akan diubah
                const picIndex = pictures.value.findIndex(p => p.id === editingPicId.value);
                // Update PIC di array
                if (picIndex > -1) {
                    pictures.value[picIndex] = {
                        ...pictures.value[picIndex],
                        name: picForm.name,
                        role: picForm.role
                    };
                    // Notifikasi: berhasil edit PIC
                    notify('Orang berhasil diperbarui!', 'success');
                }
            } else {
                // CREATE mode - buat PIC baru
                const newPic = {
                    id: Date.now().toString(),  // Gunakan timestamp sebagai ID
                    name: picForm.name,
                    role: picForm.role,
                    createdAt: new Date().toISOString()
                };
                // Tambahkan PIC baru ke array
                pictures.value.push(newPic);
                // Notifikasi: berhasil tambah PIC
                notify('Orang berhasil ditambahkan!', 'success');
            }

            // Tutup modal setelah simpan
            closePicModal();
        };

        // Fungsi untuk menghapus PIC
        const deletePic = async (picId) => {
            const ok = await showConfirm('Apakah Anda yakin? Task yang ditugaskan kepada orang ini akan tetap ada.', 'Hapus Orang');
            if (!ok) return;
            pictures.value = pictures.value.filter(p => p.id !== picId);
            notify('Orang berhasil dihapus!', 'success');
        };

        // ============================================
        // INITIALIZATION
        // ============================================
        
        // Muat data dari storage saat komponen pertama kali mount, lalu jalankan debug log
        (async () => {
            await loadFromStorage();

            // Fungsi debug: cetak sample isi localStorage dan IndexedDB ke console
            const debugStorage = async () => {
                try {
                    console.group('%cTcelFlow Storage Debug', 'color: #7c3aed; font-weight: bold');
                    // localStorage
                    try {
                        const lsTasks = JSON.parse(localStorage.getItem('tasks') || '[]');
                        const lsPics = JSON.parse(localStorage.getItem('pics') || '[]');
                        console.log('localStorage tasks:', lsTasks);
                        console.log('localStorage pics:', lsPics);
                    } catch (e) {
                        console.warn('Gagal membaca localStorage:', e);
                    }

                    // IndexedDB
                    try {
                        const db = await openIDB();
                        const tx = db.transaction('kv', 'readonly');
                        const store = tx.objectStore('kv');
                        const getReq = (k) => new Promise((res, rej) => {
                            const r = store.get(k);
                            r.onsuccess = () => res(r.result);
                            r.onerror = () => rej(r.error);
                        });
                        const idbTasks = await getReq('tasks').catch(() => null);
                        const idbPics = await getReq('pics').catch(() => null);
                        console.log('IndexedDB tasks:', idbTasks);
                        console.log('IndexedDB pics:', idbPics);
                        db.close();
                    } catch (e) {
                        console.warn('Gagal membaca IndexedDB:', e);
                    }

                    console.groupEnd();
                } catch (e) {
                    console.error('Debug storage gagal:', e);
                }
            };

            // Jalankan debug (tidak mengganggu UI)
            debugStorage();
        })();

        // ============================================
        // RETURN STATE DAN METHODS KE TEMPLATE
        // ============================================
        
        return {
            // State
            currentTab,
            pictures,
            tasks,
            showTaskModal,
            showPicModal,
            editingTaskId,
            editingPicId,
            
            // Forms
            taskForm,
            picForm,
            
            // Computed
            getTodos,
            getInProgress,
            getDone,
            tasksCount,
            picsCount,
            
            // Helpers
            getPicName,
            togglePicAssignment,
            // Notifications
            notifications,
            notify,
            dismissNotification,
            // Confirm dialog
            confirmDialog,
            confirmDialogConfirm,
            confirmDialogCancel,
            showConfirm,
            
            // Task functions
            openTaskModal,
            closeTaskModal,
            saveTask,
            deleteTask,
            exportData,
            importData,
            importFileInput,
            handleFileImport,
            
            // PIC functions
            openPicModal,
            closePicModal,
            savePic,
            deletePic
        };
    }
}).mount('#app');  // Mount aplikasi ke elemen dengan id="app" di HTML

