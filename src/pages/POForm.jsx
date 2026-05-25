import '../styles/POForm.css';
import { useState, useEffect, useRef } from 'react';
import DefaultLetterhead from '../assets/letterhead.jpg';

/* ============================================================
   LOCAL STORAGE KEYS
   ============================================================ */
const LS_SETTINGS    = 'po_settings';
const LS_ORDER       = 'po_order_data';
const LS_SAVED       = 'po_saved_orders';
const LS_COMPANY     = 'po_company_info';
const LS_LETTERHEAD  = 'po_letterhead_img';   // base64 data URL or null

/* ============================================================
   HELPERS
   ============================================================ */
const lsLoad = (key, fallback) => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
};
const lsSave = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
};

/* ============================================================
   DEFAULTS
   ============================================================ */
const DEFAULT_COMPANY = {
    name:    'VST MAARKETING',
    tagline: 'PURIFYING WATER',
    headOffice: '906 I First Floor, Thai Complex,\nTenkasi Road, Rajapalayam - 626 11',
    phone:   '04563 231045, 90477 22131',
    email:   'vstmaarketing@gmail.com',
    website: 'vstmaarketing.com',
};

const DEFAULT_ORDER = {
    date:           '',
    saleOrderNumber:'',
    customerName:   '',
    productModel:   '',
    address:        '',
    salesmanName:   '',
    mobileNumber:   '',
    contactNumber:  '',
    city:           '',
    offMail:        '',
    pincode:        '',
    email:          '',

    /* Product rows */
    products: [
        {
            id: 1,
            productModel: 'Domestic RO Purifier',
            optional:     'UV / UF / Ozone / Disinfection',
            qty:          '',
            rate:         '',
            amount:       '',
        },
        {
            id: 2,
            productModel: 'Water Dispenser',
            optional:     'Accessories - RO __ / (75/100/125)\nN / NC / NHC / Others',
            qty:          '',
            rate:         '',
            amount:       '',
        },
    ],

    /* Installation */
    waterSource:          'Borewell',   // Borewell | Corporation | Tanker
    waterTDS:             '',
    installationAddress:  '',
    preferredDate:        '',

    /* Payment */
    advanceAmount:  '',
    balanceAmount:  '',
    paymentMode:    'Cash',             // Cash | UPI | Card | Bank Transfer
    transactionId:  '',

    /* Terms */
    termsText: 'Installation will be done within 24–72 hours after confirmation. Warranty covers only manufacturing defects.',
    declarationText: 'I confirm that the above details are correct and I agree to the terms & conditions.',
};

const DEFAULT_SETTINGS = {
    fontFamily:     'Calibri',
    fontSize:       13,
    headingColor:   '#1a3a6b',
    accentColor:    '#2563eb',
    borderColor:    '#000000',
    headerBg:       '#ffffff',
    tableHeaderBg:  '#dce6f7',
    paperSize:      'A4',           // A4 | Letter
    showLogo:       true,
    showTerms:      true,
    showDeclaration:true,
    showSignature:  true,
    copies:         1,
};

const FONT_OPTIONS = [
    'Calibri','Arial','Georgia','Times New Roman',
    'Poppins','Roboto','Montserrat','Verdana','Tahoma','Courier New',
];

const WATER_SOURCE_OPTIONS = ['Borewell', 'Corporation', 'Tanker'];
const PAYMENT_MODE_OPTIONS  = ['Cash', 'UPI', 'Card', 'Bank Transfer'];

/* ============================================================
   COMPONENT
   ============================================================ */
export default function POForm() {

    /* ---- UI ---- */
    const [activeTab, setActiveTab] = useState('order');
    const [toast, setToast]         = useState(null);
    const letterheadInputRef        = useRef(null);

    /* ---- LETTERHEAD IMAGE ---- */
    // null  → use DefaultLetterhead (letterhead.jpg)
    // string → base64 data URL uploaded by user (persisted in localStorage)
    const [letterheadImg, setLetterheadImg] = useState(() => lsLoad(LS_LETTERHEAD, null));

    // The actual src to show: user upload takes priority, else the bundled default
    const letterheadSrc = letterheadImg || DefaultLetterhead;

    const handleLetterheadUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { showToast('Please upload an image file', 'error'); return; }
        const reader = new FileReader();
        reader.onload = (ev) => {
            const dataUrl = ev.target.result;
            setLetterheadImg(dataUrl);
            lsSave(LS_LETTERHEAD, dataUrl);
            showToast('Letterhead updated!');
        };
        reader.readAsDataURL(file);
        // Reset input so same file can be re-selected
        e.target.value = '';
    };

    const resetLetterhead = () => {
        setLetterheadImg(null);
        lsSave(LS_LETTERHEAD, null);
        showToast('Letterhead reset to default', 'info');
    };

    /* ---- DATA ---- */
    const [company,  setCompany]  = useState(() => lsLoad(LS_COMPANY,  DEFAULT_COMPANY));
    const [order,    setOrder]    = useState(() => lsLoad(LS_ORDER,    DEFAULT_ORDER));
    const [settings, setSettings] = useState(() => lsLoad(LS_SETTINGS, DEFAULT_SETTINGS));
    const [saved,    setSaved]    = useState(() => lsLoad(LS_SAVED,    []));
    const [saveName, setSaveName] = useState('');

    /* ============================================================
       PERSIST
       ============================================================ */
    useEffect(() => { lsSave(LS_COMPANY,  company);  }, [company]);
    useEffect(() => { lsSave(LS_ORDER,    order);    }, [order]);
    useEffect(() => { lsSave(LS_SETTINGS, settings); }, [settings]);
    useEffect(() => { lsSave(LS_SAVED,    saved);    }, [saved]);

    /* ============================================================
       TOAST
       ============================================================ */
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2600);
    };

    /* ============================================================
       FIELD HELPERS
       ============================================================ */
    const setField    = (key, val) => setOrder(o => ({ ...o, [key]: val }));
    const setSetting  = (key, val) => setSettings(s => ({ ...s, [key]: val }));
    const setCoField  = (key, val) => setCompany(c => ({ ...c, [key]: val }));

    /* ---- product rows ---- */
    const updateProduct = (id, field, val) => {
        setOrder(o => ({
            ...o,
            products: o.products.map(p => p.id === id ? { ...p, [field]: val } : p),
        }));
    };
    const addProductRow = () => {
        const newId = Date.now();
        setOrder(o => ({
            ...o,
            products: [...o.products, { id: newId, productModel: '', optional: '', qty: '', rate: '', amount: '' }],
        }));
    };
    const removeProductRow = (id) => {
        setOrder(o => ({ ...o, products: o.products.filter(p => p.id !== id) }));
    };

    /* ============================================================
       SAVED ORDERS
       ============================================================ */
    const saveOrder = () => {
        const name = saveName.trim() || `Order ${saved.length + 1}`;
        setSaved(s => [...s, { id: Date.now(), name, order: { ...order }, settings: { ...settings } }]);
        setSaveName('');
        showToast(`Saved "${name}"`);
    };
    const loadOrder = (entry) => {
        setOrder(entry.order);
        setSettings(entry.settings);
        showToast(`Loaded "${entry.name}"`);
    };
    const deleteOrder = (id) => setSaved(s => s.filter(e => e.id !== id));

    const clearOrder = () => {
        setOrder(DEFAULT_ORDER);
        showToast('Form cleared', 'info');
    };

    /* ============================================================
       PRINT — pure HTML string, no DOM cloning
       ============================================================ */
    const buildFormHTML = () => {
        const s  = settings;
        const o  = order;
        const co = company;

        const pageW = s.paperSize === 'Letter' ? '216mm' : '210mm';
        const pageH = s.paperSize === 'Letter' ? '279mm' : '297mm';

        /* field row helper */
        const fieldRow = (label, value, style = '') =>
            `<div style="display:flex;align-items:baseline;gap:4px;margin-bottom:3px;${style}">
                <span style="white-space:nowrap;font-weight:600;">${label} :</span>
                <span style="flex:1;">${value || ''}</span>
            </div>`;

        /* product rows */
        const productRows = o.products.map((p, i) =>
            `<tr>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;text-align:center;">${i + 1}</td>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;">${p.productModel}</td>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;">${p.optional.replace(/\n/g, '<br>')}</td>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;text-align:center;">${p.qty}</td>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;text-align:right;">${p.rate}</td>
                <td style="border:1px solid ${s.borderColor};padding:5px 7px;text-align:right;">${p.amount}</td>
            </tr>`).join('');

        const termsHTML = s.showTerms
            ? `<div style="margin-top:10px;">
                <p style="font-weight:700;margin-bottom:3px;">Terms &amp; Conditions</p>
                <p style="font-size:${s.fontSize - 1}px;">${o.termsText}</p>
               </div>` : '';

        const declarationHTML = s.showDeclaration
            ? `<div style="margin-top:8px;">
                <p style="font-weight:600;">Customer Declaration</p>
                <p style="font-size:${s.fontSize - 1}px;">${o.declarationText}</p>
               </div>` : '';

        const signatureHTML = s.showSignature
            ? `<div style="display:flex;justify-content:space-between;margin-top:28px;align-items:flex-end;">
                <div>
                    <p style="font-weight:700;">Authorized Signatory:</p>
                    <p style="margin-top:4px;">For <strong>${co.name}</strong></p>
                    <p style="margin-top:20px;"><strong>Signature &amp; Seal</strong> :</p>
                </div>
                <div style="text-align:center;">
                    <p style="font-weight:700;">Customer Signature</p>
                    <div style="margin-top:32px;border-bottom:1px solid #333;width:160px;"></div>
                </div>
            </div>` : '';

        return `
            <div style="
                width:${pageW};
                font-family:${s.fontFamily},Arial,sans-serif;
                font-size:${s.fontSize}px;
                color:#000;
                background:#fff;
                padding:14mm 12mm;
                box-sizing:border-box;
                page-break-inside:avoid;
            ">
                <!-- LETTERHEAD IMAGE — full width -->
                <div style="width:100%;margin-bottom:10px;line-height:0;">
                    <img src="${letterheadSrc}" alt="Letterhead"
                        style="width:100%;height:auto;display:block;object-fit:contain;" />
                </div>

                <!-- TITLE -->
                <h2 style="text-align:center;font-size:${s.fontSize + 4}px;font-weight:800;letter-spacing:1px;margin:0 0 4px;">SALE ORDER FORM</h2>
                <div style="text-align:right;font-weight:600;margin-bottom:14px;">Date : <span style="min-width:90px;display:inline-block;">${o.date || ''}</span></div>

                <!-- CUSTOMER INFO -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px;font-size:${s.fontSize}px;">
                    ${fieldRow('Sale Order Number', o.saleOrderNumber)}
                    ${fieldRow('Customer Name', o.customerName)}
                    ${fieldRow('Product / Model', o.productModel)}
                    ${fieldRow('Address', o.address)}
                    ${fieldRow('Salesman Name', o.salesmanName)}
                    ${fieldRow('Mobile Number', o.mobileNumber)}
                    ${fieldRow('Contact Number', o.contactNumber)}
                    ${fieldRow('City', o.city)}
                    ${fieldRow('Off. Mail', o.offMail)}
                    ${fieldRow('Pincode', o.pincode)}
                    <div></div>
                    ${fieldRow('E-Mail', o.email)}
                </div>

                <!-- PRODUCT DETAILS -->
                <p style="font-weight:700;margin-bottom:5px;">Product Details</p>
                <table style="width:100%;border-collapse:collapse;font-size:${s.fontSize}px;margin-bottom:14px;">
                    <thead>
                        <tr style="background:${s.tableHeaderBg};">
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;width:36px;">S.No</th>
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;text-align:left;">Product Model</th>
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;text-align:left;color:${s.accentColor};">Optional</th>
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;width:40px;">Qty</th>
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;width:60px;">Rate</th>
                            <th style="border:1px solid ${s.borderColor};padding:6px 7px;width:70px;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>${productRows}</tbody>
                </table>

                <!-- INSTALLATION + PAYMENT -->
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 24px;margin-bottom:12px;font-size:${s.fontSize}px;">
                    <div>
                        <p style="font-weight:700;margin-bottom:6px;">Installation Details</p>
                        ${fieldRow('Water Source', o.waterSource)}
                        ${fieldRow('Water TDS', o.waterTDS)}
                        ${fieldRow('Installation Address', o.installationAddress)}
                        ${fieldRow('Preferred Installation Date', o.preferredDate)}
                    </div>
                    <div>
                        <p style="font-weight:700;margin-bottom:6px;">&nbsp;</p>
                        ${fieldRow('Advance Amount', o.advanceAmount)}
                        ${fieldRow('Balance Amount', o.balanceAmount)}
                        ${fieldRow('Payment Mode', o.paymentMode)}
                        ${fieldRow('Transaction ID', o.transactionId)}
                    </div>
                </div>

                <!-- TERMS -->
                ${termsHTML}

                <!-- DECLARATION -->
                ${declarationHTML}

                <!-- SIGNATURE -->
                ${signatureHTML}
            </div>`;
    };

    const handlePrint = () => {
        const copies   = Math.max(1, Number(settings.copies) || 1);
        const pageSize = settings.paperSize === 'Letter' ? '216mm 279mm' : 'A4';

        let allCopies = '';
        for (let i = 0; i < copies; i++) {
            allCopies += `<div style="page-break-after:${i < copies - 1 ? 'always' : 'auto'};">${buildFormHTML()}</div>`;
        }

        const pw = window.open('', '', 'width=1200,height=900');
        pw.document.write(`<!DOCTYPE html><html><head><title>Sale Order</title>
            <style>
                @page { size:${pageSize}; margin:0; }
                *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
                body { background:#fff; }
                a { color:inherit; text-decoration:none; }
            </style></head>
            <body>${allCopies}</body></html>`);
        pw.document.close();
        setTimeout(() => pw.print(), 500);
    };

    /* ============================================================
       LIVE PREVIEW RENDER
       ============================================================ */
    const PreviewForm = () => {
        const s  = settings;
        const o  = order;
        const co = company;

        return (
            <div className="po-preview-paper" style={{
                fontFamily: `${s.fontFamily}, Arial, sans-serif`,
                fontSize:   `${s.fontSize}px`,
            }}>
                {/* LETTERHEAD — single full-width image */}
                <div className="po-letterhead-img-wrap">
                    <img src={letterheadSrc} alt="Letterhead" className="po-letterhead-img" />
                </div>

                {/* TITLE */}
                <h2 className="po-title" style={{ fontSize: `${s.fontSize + 4}px` }}>SALE ORDER FORM</h2>
                <div className="po-date-row">
                    Date :&nbsp;<span className="po-underline">{o.date}</span>
                </div>

                {/* CUSTOMER GRID */}
                <div className="po-customer-grid">
                    {[
                        ['Sale Order Number', o.saleOrderNumber],
                        ['Customer Name',     o.customerName],
                        ['Product / Model',   o.productModel],
                        ['Address',           o.address],
                        ['Salesman Name',     o.salesmanName],
                        ['Mobile Number',     o.mobileNumber],
                        ['Contact Number',    o.contactNumber],
                        ['City',              o.city],
                        ['Off. Mail',         o.offMail],
                        ['Pincode',           o.pincode],
                        [null, null],
                        ['E-Mail',            o.email],
                    ].map((pair, i) => pair[0] === null ? (
                        <div key={i} />
                    ) : (
                        <div key={i} className="po-field-row">
                            <span className="po-field-label">{pair[0]} :</span>
                            <span className="po-field-value po-underline">{pair[1]}</span>
                        </div>
                    ))}
                </div>

                {/* PRODUCT TABLE */}
                <p className="po-section-title">Product Details</p>
                <table className="po-table" style={{ borderColor: s.borderColor }}>
                    <thead>
                        <tr style={{ background: s.tableHeaderBg }}>
                            {['S.No','Product Model','Optional','Qty','Rate','Amount'].map(h => (
                                <th key={h} className="po-th"
                                    style={{ borderColor: s.borderColor, color: h === 'Optional' ? s.accentColor : 'inherit' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {o.products.map((p, i) => (
                            <tr key={p.id}>
                                <td className="po-td po-td--center" style={{ borderColor: s.borderColor }}>{i + 1}</td>
                                <td className="po-td" style={{ borderColor: s.borderColor }}>{p.productModel}</td>
                                <td className="po-td po-td--optional" style={{ borderColor: s.borderColor }}>
                                    {p.optional.split('\n').map((l,j) => <span key={j}>{l}<br /></span>)}
                                </td>
                                <td className="po-td po-td--center" style={{ borderColor: s.borderColor }}>{p.qty}</td>
                                <td className="po-td po-td--right"  style={{ borderColor: s.borderColor }}>{p.rate}</td>
                                <td className="po-td po-td--right"  style={{ borderColor: s.borderColor }}>{p.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* INSTALLATION + PAYMENT */}
                <div className="po-bottom-grid">
                    <div>
                        <p className="po-section-title">Installation Details</p>
                        {[
                            ['Water Source',               o.waterSource],
                            ['Water TDS',                  o.waterTDS],
                            ['Installation Address',       o.installationAddress],
                            ['Preferred Installation Date',o.preferredDate],
                        ].map(([l,v]) => (
                            <div key={l} className="po-field-row">
                                <span className="po-field-label">{l} :</span>
                                <span className="po-field-value po-underline">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div>
                        <p className="po-section-title">&nbsp;</p>
                        {[
                            ['Advance Amount',  o.advanceAmount],
                            ['Balance Amount',  o.balanceAmount],
                            ['Payment Mode',    o.paymentMode],
                            ['Transaction ID',  o.transactionId],
                        ].map(([l,v]) => (
                            <div key={l} className="po-field-row">
                                <span className="po-field-label">{l} :</span>
                                <span className="po-field-value po-underline">{v}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* TERMS */}
                {s.showTerms && (
                    <div className="po-terms">
                        <p className="po-terms-title">Terms &amp; Conditions</p>
                        <p style={{ fontSize: `${s.fontSize - 1}px` }}>{o.termsText}</p>
                    </div>
                )}

                {/* DECLARATION */}
                {s.showDeclaration && (
                    <div className="po-declaration">
                        <p className="po-terms-title" style={{ fontWeight: 600 }}>Customer Declaration</p>
                        <p style={{ fontSize: `${s.fontSize - 1}px` }}>{o.declarationText}</p>
                    </div>
                )}

                {/* SIGNATURE */}
                {s.showSignature && (
                    <div className="po-signature-row">
                        <div>
                            <p className="po-sig-label">Authorized Signatory:</p>
                            <p style={{ marginTop: 4 }}>For <strong>{co.name}</strong></p>
                            <p className="po-sig-seal"><strong>Signature &amp; Seal</strong> :</p>
                        </div>
                        <div className="po-sig-customer">
                            <p className="po-sig-label">Customer Signature</p>
                            <div className="po-sig-line" />
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ============================================================
       TABS
       ============================================================ */
    const TABS = [
        { id: 'order',   label: 'Order Info'  },
        { id: 'product', label: 'Products'    },
        { id: 'install', label: 'Installation'},
        { id: 'payment', label: 'Payment'     },
        { id: 'company', label: 'Company'     },
        { id: 'design',  label: 'Design'      },
        { id: 'saved',   label: 'Saved'       },
    ];

    /* ============================================================
       RENDER
       ============================================================ */
    return (
        <div className="po-area">

            {toast && <div className={`po-toast po-toast--${toast.type}`}>{toast.msg}</div>}

            {/* ====================================================
                LEFT — PREVIEW
                ==================================================== */}
            <div className="po-area-left">

                <div className="po-action-bar">
                    <button className="po-print-btn" onClick={handlePrint}>
                        🖨&nbsp; Print {settings.copies > 1 ? `(${settings.copies} copies)` : 'Form'}
                    </button>
                    <button className="po-clear-btn" onClick={clearOrder}>↺ Clear</button>
                </div>

                <div className="po-preview-scroll">
                    <PreviewForm />
                </div>
            </div>

            {/* ====================================================
                RIGHT — EDITOR
                ==================================================== */}
            <div className="po-area-right">

                {/* TAB NAV */}
                <div className="po-editor-nav">
                    {TABS.map(t => (
                        <button key={t.id}
                            className={`po-nav-btn${activeTab === t.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(t.id)}>
                            {t.label}
                        </button>
                    ))}
                </div>

                <div className="po-editor-body">

                    {/* ========== ORDER INFO ========== */}
                    {activeTab === 'order' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">📋</span><h3>Order Information</h3></div>

                            <div className="po-field-group">
                                <label>Date</label>
                                <input type="date" value={order.date} onChange={e => setField('date', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Sale Order Number</label>
                                <input type="text" placeholder="e.g. SO-2024-001" value={order.saleOrderNumber} onChange={e => setField('saleOrderNumber', e.target.value)} />
                            </div>

                            <div className="po-group-title">Customer Details</div>
                            <div className="po-grid-2">
                                <div className="po-field-group">
                                    <label>Customer Name</label>
                                    <input type="text" value={order.customerName} onChange={e => setField('customerName', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Mobile Number</label>
                                    <input type="text" value={order.mobileNumber} onChange={e => setField('mobileNumber', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Contact Number</label>
                                    <input type="text" value={order.contactNumber} onChange={e => setField('contactNumber', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>City</label>
                                    <input type="text" value={order.city} onChange={e => setField('city', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Pincode</label>
                                    <input type="text" value={order.pincode} onChange={e => setField('pincode', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>E-Mail</label>
                                    <input type="email" value={order.email} onChange={e => setField('email', e.target.value)} />
                                </div>
                            </div>
                            <div className="po-field-group">
                                <label>Address</label>
                                <textarea rows={2} value={order.address} onChange={e => setField('address', e.target.value)} />
                            </div>

                            <div className="po-group-title">Sales Details</div>
                            <div className="po-grid-2">
                                <div className="po-field-group">
                                    <label>Product / Model</label>
                                    <input type="text" value={order.productModel} onChange={e => setField('productModel', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Salesman Name</label>
                                    <input type="text" value={order.salesmanName} onChange={e => setField('salesmanName', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Off. Mail</label>
                                    <input type="email" value={order.offMail} onChange={e => setField('offMail', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== PRODUCTS ========== */}
                    {activeTab === 'product' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">📦</span><h3>Product Details</h3></div>
                            <p className="po-hint">Edit product rows that appear in the table.</p>

                            {order.products.map((p, i) => (
                                <div className="po-product-card" key={p.id}>
                                    <div className="po-product-card-header">
                                        <span className="po-product-num">Row {i + 1}</span>
                                        <button className="po-remove-btn" onClick={() => removeProductRow(p.id)}>✕ Remove</button>
                                    </div>
                                    <div className="po-field-group">
                                        <label>Product Model</label>
                                        <input type="text" value={p.productModel}
                                            onChange={e => updateProduct(p.id, 'productModel', e.target.value)} />
                                    </div>
                                    <div className="po-field-group">
                                        <label>Optional (separate lines with Enter)</label>
                                        <textarea rows={2} value={p.optional}
                                            onChange={e => updateProduct(p.id, 'optional', e.target.value)} />
                                    </div>
                                    <div className="po-grid-3">
                                        <div className="po-field-group">
                                            <label>Qty</label>
                                            <input type="text" value={p.qty}
                                                onChange={e => updateProduct(p.id, 'qty', e.target.value)} />
                                        </div>
                                        <div className="po-field-group">
                                            <label>Rate (₹)</label>
                                            <input type="text" value={p.rate}
                                                onChange={e => updateProduct(p.id, 'rate', e.target.value)} />
                                        </div>
                                        <div className="po-field-group">
                                            <label>Amount (₹)</label>
                                            <input type="text" value={p.amount}
                                                onChange={e => updateProduct(p.id, 'amount', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <button className="po-add-btn" onClick={addProductRow}>+ Add Product Row</button>
                        </div>
                    )}

                    {/* ========== INSTALLATION ========== */}
                    {activeTab === 'install' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">🔧</span><h3>Installation Details</h3></div>

                            <div className="po-field-group">
                                <label>Water Source</label>
                                <div className="po-radio-group">
                                    {WATER_SOURCE_OPTIONS.map(opt => (
                                        <label key={opt} className={`po-radio-card${order.waterSource === opt ? ' active' : ''}`}>
                                            <input type="radio" name="waterSource" value={opt}
                                                checked={order.waterSource === opt}
                                                onChange={() => setField('waterSource', opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="po-field-group">
                                <label>Water TDS</label>
                                <input type="text" placeholder="e.g. 450 ppm" value={order.waterTDS}
                                    onChange={e => setField('waterTDS', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Installation Address</label>
                                <textarea rows={2} value={order.installationAddress}
                                    onChange={e => setField('installationAddress', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Preferred Installation Date</label>
                                <input type="date" value={order.preferredDate}
                                    onChange={e => setField('preferredDate', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* ========== PAYMENT ========== */}
                    {activeTab === 'payment' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">💰</span><h3>Payment Details</h3></div>

                            <div className="po-grid-2">
                                <div className="po-field-group">
                                    <label>Advance Amount (₹)</label>
                                    <input type="text" value={order.advanceAmount}
                                        onChange={e => setField('advanceAmount', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Balance Amount (₹)</label>
                                    <input type="text" value={order.balanceAmount}
                                        onChange={e => setField('balanceAmount', e.target.value)} />
                                </div>
                            </div>

                            <div className="po-field-group">
                                <label>Payment Mode</label>
                                <div className="po-radio-group">
                                    {PAYMENT_MODE_OPTIONS.map(opt => (
                                        <label key={opt} className={`po-radio-card${order.paymentMode === opt ? ' active' : ''}`}>
                                            <input type="radio" name="paymentMode" value={opt}
                                                checked={order.paymentMode === opt}
                                                onChange={() => setField('paymentMode', opt)} />
                                            {opt}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="po-field-group">
                                <label>Transaction ID</label>
                                <input type="text" value={order.transactionId}
                                    onChange={e => setField('transactionId', e.target.value)} />
                            </div>

                            <div className="po-group-title">Terms &amp; Declaration Text</div>
                            <div className="po-field-group">
                                <label>Terms &amp; Conditions Text</label>
                                <textarea rows={3} value={order.termsText}
                                    onChange={e => setField('termsText', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Customer Declaration Text</label>
                                <textarea rows={2} value={order.declarationText}
                                    onChange={e => setField('declarationText', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* ========== COMPANY ========== */}
                    {activeTab === 'company' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">🏢</span><h3>Company Info</h3></div>

                            {/* LETTERHEAD IMAGE UPLOAD */}
                            <div className="po-letterhead-upload-box">
                                <div className="po-letterhead-preview-wrap">
                                    <img src={letterheadSrc} alt="Letterhead preview" className="po-letterhead-preview-img" />
                                </div>
                                <p className="po-hint" style={{ marginTop: 8 }}>
                                    This image is used as the full header on the printed form.
                                    Default: <code>letterhead.jpg</code>
                                </p>
                                <div className="po-letterhead-btn-row">
                                    <input
                                        ref={letterheadInputRef}
                                        type="file"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handleLetterheadUpload}
                                    />
                                    <button className="po-save-btn"
                                        onClick={() => letterheadInputRef.current?.click()}>
                                        📁 Upload Letterhead Image
                                    </button>
                                    {letterheadImg && (
                                        <button className="po-danger-btn" style={{ width: 'auto', margin: 0 }}
                                            onClick={resetLetterhead}>
                                            ↺ Reset to Default
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="po-group-title">Company Details (used in signature section)</div>
                            <div className="po-field-group">
                                <label>Company Name</label>
                                <input type="text" value={company.name} onChange={e => setCoField('name', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Tagline</label>
                                <input type="text" value={company.tagline} onChange={e => setCoField('tagline', e.target.value)} />
                            </div>
                            <div className="po-field-group">
                                <label>Head Office Address (one line per Enter)</label>
                                <textarea rows={2} value={company.headOffice} onChange={e => setCoField('headOffice', e.target.value)} />
                            </div>
                            <div className="po-grid-2">
                                <div className="po-field-group">
                                    <label>Phone</label>
                                    <input type="text" value={company.phone} onChange={e => setCoField('phone', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Email</label>
                                    <input type="email" value={company.email} onChange={e => setCoField('email', e.target.value)} />
                                </div>
                                <div className="po-field-group">
                                    <label>Website</label>
                                    <input type="text" value={company.website} onChange={e => setCoField('website', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========== DESIGN ========== */}
                    {activeTab === 'design' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">🎨</span><h3>Design &amp; Settings</h3></div>

                            <div className="po-settings-group">
                                <div className="po-settings-title">Typography</div>
                                <div className="po-field-group">
                                    <label>Font Family</label>
                                    <select value={settings.fontFamily} onChange={e => setSetting('fontFamily', e.target.value)}>
                                        {FONT_OPTIONS.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                </div>
                                <div className="po-field-group">
                                    <label>Base Font Size (px)</label>
                                    <input type="number" min="9" max="18" value={settings.fontSize}
                                        onChange={e => setSetting('fontSize', Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="po-settings-group">
                                <div className="po-settings-title">Colors</div>
                                <div className="po-grid-2">
                                    <div className="po-field-group">
                                        <label>Heading Color</label>
                                        <input type="color" value={settings.headingColor}
                                            onChange={e => setSetting('headingColor', e.target.value)} />
                                    </div>
                                    <div className="po-field-group">
                                        <label>Accent / Link Color</label>
                                        <input type="color" value={settings.accentColor}
                                            onChange={e => setSetting('accentColor', e.target.value)} />
                                    </div>
                                    <div className="po-field-group">
                                        <label>Border Color</label>
                                        <input type="color" value={settings.borderColor}
                                            onChange={e => setSetting('borderColor', e.target.value)} />
                                    </div>
                                    <div className="po-field-group">
                                        <label>Table Header BG</label>
                                        <input type="color" value={settings.tableHeaderBg}
                                            onChange={e => setSetting('tableHeaderBg', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div className="po-settings-group">
                                <div className="po-settings-title">Page &amp; Print</div>
                                <div className="po-field-group">
                                    <label>Paper Size</label>
                                    <div className="po-radio-group">
                                        {['A4','Letter'].map(s => (
                                            <label key={s} className={`po-radio-card${settings.paperSize === s ? ' active' : ''}`}>
                                                <input type="radio" name="paperSize" value={s}
                                                    checked={settings.paperSize === s}
                                                    onChange={() => setSetting('paperSize', s)} />
                                                {s}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="po-field-group">
                                    <label>Print Copies</label>
                                    <input type="number" min="1" max="20" value={settings.copies}
                                        onChange={e => setSetting('copies', Number(e.target.value))} />
                                </div>
                            </div>

                            <div className="po-settings-group">
                                <div className="po-settings-title">Show / Hide Sections</div>
                                {[
                                    ['showTerms',       'Show Terms & Conditions'],
                                    ['showDeclaration', 'Show Customer Declaration'],
                                    ['showSignature',   'Show Signature Section'],
                                ].map(([key, label]) => (
                                    <label key={key} className="po-toggle-row">
                                        <input type="checkbox" checked={settings[key]}
                                            onChange={e => setSetting(key, e.target.checked)} />
                                        <span>{label}</span>
                                    </label>
                                ))}
                            </div>

                            <button className="po-danger-btn"
                                onClick={() => { setSettings(DEFAULT_SETTINGS); showToast('Design reset','info'); }}>
                                ↺ Reset Design to Default
                            </button>
                        </div>
                    )}

                    {/* ========== SAVED ========== */}
                    {activeTab === 'saved' && (
                        <div className="po-section">
                            <div className="po-section-hdr"><span className="po-section-icon">💾</span><h3>Saved Orders</h3></div>
                            <p className="po-hint">Save the current form data and load it later.</p>

                            <div className="po-save-row">
                                <input type="text" placeholder="Order name..."
                                    value={saveName} onChange={e => setSaveName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && saveOrder()} />
                                <button className="po-save-btn" onClick={saveOrder}>Save</button>
                            </div>

                            {saved.length === 0 ? (
                                <p className="po-empty">No saved orders yet.</p>
                            ) : (
                                <div className="po-saved-list">
                                    {saved.map(entry => (
                                        <div className="po-saved-card" key={entry.id}>
                                            <div className="po-saved-info">
                                                <span className="po-saved-name">{entry.name}</span>
                                                <span className="po-saved-meta">
                                                    {entry.order.customerName || '–'} &middot; {entry.order.saleOrderNumber || '–'}
                                                </span>
                                            </div>
                                            <div className="po-saved-actions">
                                                <button className="po-load-btn" onClick={() => loadOrder(entry)}>Load</button>
                                                <button className="po-remove-btn" onClick={() => deleteOrder(entry.id)}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
