import '../styles/POForm.css';
import { useState, useRef, useEffect } from 'react';

/* ============================================================
   LOCAL STORAGE KEY
   ============================================================ */
const LS_SAVED_FILES = 'po_saved_pdf_files';

const lsLoad = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
};
const lsSave = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

/* ============================================================
   LOAD SCRIPT HELPER  (idempotent, with timeout)
   ============================================================ */
const loadScript = (src) =>
    new Promise((res, rej) => {
        if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
        const s = document.createElement('script');
        s.src     = src;
        s.onload  = () => res();
        s.onerror = () => rej(new Error(`Failed to load ${src}`));
        setTimeout(() => rej(new Error(`Timeout: ${src}`)), 20000);
        document.head.appendChild(s);
    });

/* ============================================================
   ENSURE pdf-lib  →  window.PDFLib
   Tries two CDNs so one failure doesn't block the user.
   ============================================================ */
const PDF_LIB_CDNS = [
    'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
    'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js',
];

const ensurePdfLib = async () => {
    if (window.PDFLib) return;
    for (const cdn of PDF_LIB_CDNS) {
        try {
            await loadScript(cdn);
            if (window.PDFLib) return;
        } catch { /* try next */ }
    }
    throw new Error('Could not load pdf-lib. Check your internet connection.');
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function POForm() {

    const [toast,         setToast]         = useState(null);
    const [uploadedFile,  setUploadedFile]  = useState(null);
    const [isDragging,    setIsDragging]    = useState(false);
    const fileInputRef                      = useRef(null);

    const [serialPrefix,  setSerialPrefix]  = useState('');
    const [printFrom,     setPrintFrom]     = useState('');
    const [printTo,       setPrintTo]       = useState('');
    const [isProcessing,  setIsProcessing]  = useState(false);
    const [printProgress, setPrintProgress] = useState(null);

    const [savedFiles, setSavedFiles] = useState(() => lsLoad(LS_SAVED_FILES, []));
    const [activeTab,  setActiveTab]  = useState('upload');

    useEffect(() => { lsSave(LS_SAVED_FILES, savedFiles); }, [savedFiles]);

    /* ---- Toast ---- */
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2800);
    };

    /* ==========================================================
       FILE HANDLING — PDF only
       ========================================================== */
    const readFileAsBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader  = new FileReader();
            reader.onload  = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Read failed'));
            reader.readAsDataURL(file);
        });

    const processFile = async (file) => {
        if (!file) return;
        const isPDF = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
        if (!isPDF) {
            showToast('Please upload a PDF file (.pdf)', 'error');
            return;
        }
        try {
            const base64 = await readFileAsBase64(file);
            setUploadedFile({
                name:       file.name,
                base64,
                size:       file.size,
                uploadedAt: new Date().toLocaleString(),
            });
            showToast(`"${file.name}" uploaded`);
        } catch {
            showToast('Failed to read file', 'error');
        }
    };

    const handleFileInput = (e) => { processFile(e.target.files?.[0]); e.target.value = ''; };
    const handleDrop      = (e)  => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files?.[0]); };

    /* ==========================================================
       SAVED FILES
       ========================================================== */
    const saveCurrentFile = () => {
        if (!uploadedFile) { showToast('No file to save', 'error'); return; }
        if (savedFiles.some(f => f.name === uploadedFile.name)) {
            showToast(`"${uploadedFile.name}" is already saved`, 'info'); return;
        }
        setSavedFiles(prev => [{ ...uploadedFile, id: Date.now() }, ...prev]);
        showToast(`Saved "${uploadedFile.name}"`);
    };

    const loadSavedFile   = (entry) => { setUploadedFile(entry); setActiveTab('upload'); showToast(`Loaded "${entry.name}"`); };
    const deleteSavedFile = (id)    => { setSavedFiles(prev => prev.filter(f => f.id !== id)); showToast('File removed', 'info'); };

    /* ==========================================================
       BASE64 DATA-URL  →  Uint8Array
       ========================================================== */
    const base64ToUint8Array = (dataUrl) => {
        const b64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
        const bin = atob(b64);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return arr;
    };

    /* ==========================================================
       SERIAL PRINT  —  pdf-lib strategy
       ─────────────────────────────────────────────────────────
       For each serial number n in [from, to]:
         1. Load the original PDF bytes with PDFLib.PDFDocument.load()
         2. For every page in that PDF, draw the serial text at
            top-left (x=20, y = height-30) using Helvetica-Bold.
            No background, no border — pure text overlay.
         3. Save the stamped PDF as bytes → Blob → object URL.
         4. Open the URL in a new tab and call print().
       ─────────────────────────────────────────────────────────
       We process serials one at a time to keep memory low.
       ========================================================== */
    const handleSerialPrint = async () => {
        if (!uploadedFile) { showToast('Upload a PDF file first', 'error'); return; }

        const from = parseInt(printFrom, 10);
        const to   = parseInt(printTo,   10);
        if (isNaN(from) || isNaN(to)) { showToast('Enter valid From and To numbers', 'error'); return; }
        if (from > to)                { showToast('"From" must be ≤ "To"', 'error'); return; }
        if (to - from > 499)          { showToast('Range too large (max 500)', 'error'); return; }

        setIsProcessing(true);
        setPrintProgress({ current: 0, total: to - from + 1 });

        try {
            /* 1. Ensure pdf-lib is loaded */
            await ensurePdfLib();
            const { PDFDocument, StandardFonts, rgb } = window.PDFLib;

            /* 2. Decode original PDF bytes once */
            const srcBytes = base64ToUint8Array(uploadedFile.base64);

            const total = to - from + 1;

            /* 3. Build one combined PDF that holds all serials as separate pages */
            const mergedDoc = await PDFDocument.create();
            const font      = await mergedDoc.embedFont(StandardFonts.HelveticaBold);

            for (let n = from; n <= to; n++) {
                setPrintProgress({ current: n - from + 1, total });

                const serial = `${serialPrefix}${n}`;

                /* Load a fresh copy of the source PDF for each serial */
                const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });

                /* Copy all pages from source into a temp doc */
                const tmpDoc   = await PDFDocument.create();
                const tmpFont  = await tmpDoc.embedFont(StandardFonts.HelveticaBold);
                const copiedPages = await tmpDoc.copyPages(srcDoc, srcDoc.getPageIndices());

                for (const page of copiedPages) {
                    tmpDoc.addPage(page);
                    const { width, height } = page.getSize();

                    /* Draw serial text at top-left — no box, no border */
                    page.drawText(serial, {
                        x:    15,
                        y:    height - 20,
                        size: 10,
                        font: tmpFont,
                        color: rgb(0, 0, 0),   // dark navy blue
                        opacity: 0.75,
                    });
                }

                /* Copy stamped pages into the merged output doc */
                const stampedPages = await mergedDoc.copyPages(tmpDoc, tmpDoc.getPageIndices());
                for (const p of stampedPages) mergedDoc.addPage(p);

                /* Yield to UI */
                await new Promise(r => setTimeout(r, 5));
            }

            /* 4. Save merged PDF → Blob → object URL */
            const mergedBytes = await mergedDoc.save();
            const blob        = new Blob([mergedBytes], { type: 'application/pdf' });
            const url         = URL.createObjectURL(blob);

            /* 5. Open in a new tab — browser's native PDF viewer handles printing */
            const pw = window.open(url, '_blank');
            if (!pw) {
                showToast('Pop-up blocked — please allow pop-ups and try again', 'error');
                URL.revokeObjectURL(url);
                setIsProcessing(false);
                setPrintProgress(null);
                return;
            }

            /* Auto-trigger print once the PDF loads */
            pw.addEventListener('load', () => {
                setTimeout(() => {
                    pw.print();
                    /* Revoke after a delay so the PDF stays accessible */
                    setTimeout(() => URL.revokeObjectURL(url), 60000);
                }, 400);
            });

            setIsProcessing(false);
            setPrintProgress(null);
            showToast(`Ready to print: ${serialPrefix || ''}${from} – ${serialPrefix || ''}${to}`);

        } catch (err) {
            console.error('Serial print error:', err);
            showToast(`Error: ${err.message || 'Failed to process PDF'}`, 'error');
            setIsProcessing(false);
            setPrintProgress(null);
        }
    };

    /* ==========================================================
       HELPERS
       ========================================================== */
    const formatSize = (bytes) => {
        if (bytes < 1024)    return `${bytes} B`;
        if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    };

    const previewSerial = () => {
        const f = parseInt(printFrom, 10);
        const t = parseInt(printTo,   10);
        if (isNaN(f) || isNaN(t) || f > t) return null;
        const p = serialPrefix || '';
        return [f, Math.floor(f + (t - f) / 2), t]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map(n => `${p}${n}`).join('  →  ');
    };

    /* ==========================================================
       RENDER
       ========================================================== */
    return (
        <div className="po-area">

            {/* ============ LEFT — Upload Drop Zone ============ */}
            <div className="po-area-left">

                <div
                    className={`po-upload-dropzone${isDragging ? ' dragging' : ''}${uploadedFile ? ' has-file' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => !uploadedFile && fileInputRef.current?.click()}
                    style={{ cursor: uploadedFile ? 'default' : 'pointer' }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        style={{ display: 'none' }}
                        onChange={handleFileInput}
                    />

                    {!uploadedFile ? (
                        <div className="po-dropzone-idle">
                            <div className="po-dropzone-icon">📋</div>
                            <p className="po-dropzone-title">Drop your PDF file here</p>
                            <p className="po-dropzone-sub">or <span className="po-link">click to browse</span></p>
                            <p className="po-dropzone-hint">Accepts .pdf files only</p>
                        </div>
                    ) : (
                        <div className="po-file-preview">
                            <div className="po-file-icon-wrap">
                                <span className="po-file-icon">📋</span>
                            </div>
                            <div className="po-file-meta">
                                <p className="po-file-name">{uploadedFile.name}</p>
                                <p className="po-file-info">
                                    {formatSize(uploadedFile.size)} · {uploadedFile.uploadedAt || 'just now'}
                                </p>
                            </div>
                            <button
                                className="po-remove-btn"
                                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                            >✕ Remove</button>
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                <div className="po-action-bar">
                    <button
                        className="po-print-btn"
                        onClick={handleSerialPrint}
                        disabled={!uploadedFile || isProcessing}
                        style={{ opacity: (!uploadedFile || isProcessing) ? 0.55 : 1 }}
                    >
                        {isProcessing
                            ? `⏳ Processing ${printProgress?.current ?? '…'}/${printProgress?.total ?? '…'}`
                            : '🖨️ Serial Print'}
                    </button>

                    <button
                        className="po-clear-btn"
                        onClick={saveCurrentFile}
                        disabled={!uploadedFile}
                        style={{ opacity: !uploadedFile ? 0.55 : 1 }}
                    >💾 Save File</button>

                    <button
                        className="po-clear-btn"
                        onClick={() => fileInputRef.current?.click()}
                    >📂 Change</button>
                </div>

                {/* Serial preview badge */}
                {previewSerial() && (
                    <div className="po-serial-preview">
                        <span className="po-serial-preview-label">Serial preview:</span>
                        <span className="po-serial-preview-value">{previewSerial()}</span>
                    </div>
                )}
            </div>

            {/* ============ RIGHT — Settings Panel ============ */}
            <div className="po-area-right">
                <div className="po-editor-nav">
                    {[
                        { key: 'upload', icon: '🖨️', label: 'Print Settings' },
                        { key: 'saved',  icon: '💾', label: 'Saved Files'    },
                    ].map(({ key, icon, label }) => (
                        <button
                            key={key}
                            className={`po-nav-btn${activeTab === key ? ' active' : ''}`}
                            onClick={() => setActiveTab(key)}
                        >
                            <span>{icon}</span>{label}
                        </button>
                    ))}
                </div>

                <div className="po-editor-body">

                    {/* ── Print Settings tab ── */}
                    {activeTab === 'upload' && (
                        <div className="po-section">
                            <div className="po-section-hdr">
                                <span className="po-section-icon">🖨️</span>
                                <h3>Serial Print Settings</h3>
                            </div>
                            <p className="po-hint">
                                Upload a PDF, set a print range, and optionally a prefix.
                                Each copy gets its serial stamped at the top-left — PDF layout is preserved exactly.
                            </p>

                            {/* Serial Prefix */}
                            <div className="po-settings-group">
                                <div className="po-settings-title">Serial Prefix (optional)</div>
                                <div className="po-field-group">
                                    <label>Prefix</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. AA, INV, PO-"
                                        value={serialPrefix}
                                        onChange={e => setSerialPrefix(e.target.value)}
                                        maxLength={20}
                                    />
                                </div>
                                <p className="po-hint" style={{ marginTop: 0 }}>
                                    Prefix <strong>AA</strong> + range 3–5 → serials <strong>AA3, AA4, AA5</strong>
                                </p>
                            </div>

                            {/* Print Range */}
                            <div className="po-settings-group">
                                <div className="po-settings-title">Print Count Range</div>
                                <div className="po-grid-2">
                                    <div className="po-field-group">
                                        <label>From</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 1"
                                            value={printFrom}
                                            min="1"
                                            onChange={e => setPrintFrom(e.target.value)}
                                        />
                                    </div>
                                    <div className="po-field-group">
                                        <label>To</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 10"
                                            value={printTo}
                                            min="1"
                                            onChange={e => setPrintTo(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {printFrom && printTo && parseInt(printFrom) <= parseInt(printTo) && (
                                    <p className="po-hint" style={{ marginTop: 4 }}>
                                        Total copies: <strong>{parseInt(printTo) - parseInt(printFrom) + 1}</strong>
                                    </p>
                                )}
                                {printFrom && printTo && parseInt(printFrom) > parseInt(printTo) && (
                                    <p className="po-hint" style={{ color: 'var(--red)', marginTop: 4 }}>
                                        ⚠ "From" must be ≤ "To"
                                    </p>
                                )}
                            </div>

                            {/* How it works */}
                            <div className="po-settings-group">
                                <div className="po-settings-title">How it works</div>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                                    <p>① Upload a <strong>.pdf</strong> file.</p>
                                    <p>② Set <strong>From</strong> and <strong>To</strong> numbers.</p>
                                    <p>③ Optionally add a <strong>Prefix</strong> (e.g. <em>AA</em>).</p>
                                    <p>④ Click <strong>Serial Print</strong> — all copies are merged into one PDF; each copy has its serial stamped at the top-left. The browser's PDF viewer opens for printing.</p>
                                    <p>⑤ Click <strong>Save File</strong> to store it for future sessions.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Saved Files tab ── */}
                    {activeTab === 'saved' && (
                        <div className="po-section">
                            <div className="po-section-hdr">
                                <span className="po-section-icon">💾</span>
                                <h3>Saved PDF Files</h3>
                            </div>
                            <p className="po-hint">Files saved here persist across sessions.</p>

                            {savedFiles.length === 0 ? (
                                <p className="po-empty">No files saved yet. Upload a PDF and click "Save File".</p>
                            ) : (
                                <div className="po-saved-list">
                                    {savedFiles.map(entry => (
                                        <div className="po-saved-card" key={entry.id}>
                                            <div className="po-saved-info">
                                                <span className="po-saved-name">📋 {entry.name}</span>
                                                <span className="po-saved-meta">
                                                    {formatSize(entry.size)} · {entry.uploadedAt || ''}
                                                </span>
                                            </div>
                                            <div className="po-saved-actions">
                                                <button className="po-load-btn" onClick={() => loadSavedFile(entry)}>Load</button>
                                                <button className="po-remove-btn" onClick={() => deleteSavedFile(entry.id)}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`po-toast po-toast--${toast.type}`}>{toast.msg}</div>
            )}
        </div>
    );
}
