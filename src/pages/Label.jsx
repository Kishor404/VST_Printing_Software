import '../styles/Label.css';
import { useRef, useState, useEffect, useCallback } from 'react';

import Fragile          from "../assets/Icons/parcel_icon/fragile.svg";
import KeepDry          from "../assets/Icons/parcel_icon/keep-dry.svg";
import ThisWayUp        from "../assets/Icons/parcel_icon/this-way-up.svg";
import HandleWithCare   from "../assets/Icons/parcel_icon/handle-with-care.svg";
import Heavy            from "../assets/Icons/parcel_icon/heavy.svg";
import KeepAwayFromHeat from "../assets/Icons/parcel_icon/keep-away-from-heat.svg";
import Logo             from "../assets/logo/logo.png";

/* ============================================================
   LOCAL STORAGE KEYS
   ============================================================ */
const LS_FROM     = "label_from_address";
const LS_TO_LIST  = "label_to_list";
const LS_PARCEL   = "label_parcel_details";
const LS_ICONS    = "label_selected_icons";
const LS_SETTINGS = "label_settings";
const LS_DESIGNS  = "label_saved_designs";
const LS_COUNT    = "label_count_state";

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
const DEFAULT_FROM   = ["VST Marketing", "77, Text", "Rajapalayam"];
const DEFAULT_TO     = ["Company", "66, Text", "GG Nagar", "Rajapalayam"];
const DEFAULT_PARCEL = [
    { label: "Remark",   value: "Demo"   },
    { label: "Order ID", value: "3AS7CV" },
    { label: "Weight",   value: "80KG"   },
];
const DEFAULT_SETTINGS = {
    labelWidth: 100, labelHeight: 150,
    labelBg: "#ffffff",
    fontFamily: "Calibri", fontColor: "#000000",
    fontSize: 14, headingSize: 16, headingColor: "#3763ae",
    lineHeight: 1.5, letterSpacing: 0,
    sectionGap: 10, iconGap: 6, addressGap: 10,
    containerPadding: 2, addressPadding: 5, detailPadding: 5,
    borderWidth: 2, borderColor: "#000000", borderRadius: 8,
    iconSize: 10, iconTextSize: 12, iconBorderRadius: 8,
    logoWidth: 60, hrColor: "#cccccc", hrWidth: 1,
    showLogo: true, showIcons: true, showParcelDetails: true,
};
const DEFAULT_COUNT = {
    total: 10,
    currentBatchStart: 1,   // 1-based; next sequential label number
    showCountIcon: false,
    mode: "sequential",     // "sequential" | "set" | "custom"
    selectedSet: 0,         // 0-based index used in "set" mode
    customNumbers: [],      // used in "custom" mode
};
const FONT_OPTIONS = [
    "Calibri","Arial","Poppins","Roboto","Montserrat",
    "Georgia","Times New Roman","Courier New","Verdana","Tahoma",
];

/* ============================================================
   GRID CALC
   ============================================================ */
const computeGrid = (w, h) => {
    const cols = Math.max(1, Math.floor(210 / Math.max(1, w)));
    const rows = Math.max(1, Math.floor(297 / Math.max(1, h)));
    return { cols, rows, perPage: cols * rows };
};

/* ============================================================
   BUILD ALL SETS
   ============================================================ */
const buildSets = (total, perPage) => {
    const sets = [];
    let s = 1;
    while (s <= total) {
        sets.push({ start: s, end: Math.min(s + perPage - 1, total) });
        s += perPage;
    }
    return sets;
};

/* ============================================================
   COMPONENT
   ============================================================ */
export default function Label() {
    

    /* ---- UI ---- */
    const [activeSection, setActiveSection] = useState("from");
    const [toast, setToast]                 = useState(null);

    /* ---- FROM ---- */
    const [fromAddress, setFromAddress] = useState(() => lsLoad(LS_FROM, DEFAULT_FROM));
    const [fromSaved,   setFromSaved]   = useState(() => lsLoad(LS_FROM, DEFAULT_FROM));

    /* ---- TO ---- */
    const [toAddressList, setToAddressList] = useState(() => lsLoad(LS_TO_LIST, [DEFAULT_TO]));
    const [activeToIndex, setActiveToIndex] = useState(0);
    const [toAddress,     setToAddress]     = useState(() => {
        const list = lsLoad(LS_TO_LIST, [DEFAULT_TO]);
        return list[0] || DEFAULT_TO;
    });
    const [showToManager, setShowToManager] = useState(false);
    const [newToName,     setNewToName]     = useState("");

    /* ---- PARCEL ---- */
    const [parcelDetails, setParcelDetails] = useState(() => lsLoad(LS_PARCEL, DEFAULT_PARCEL));

    /* ---- ICONS ---- */
    const ICON_LIST = [
        { name: "Fragile",             icon: Fragile            },
        { name: "Keep Dry",            icon: KeepDry            },
        { name: "This Way Up",         icon: ThisWayUp          },
        { name: "Handle With Care",    icon: HandleWithCare     },
        { name: "Heavy",               icon: Heavy              },
        { name: "Keep Away From Heat", icon: KeepAwayFromHeat   },
    ];
    const [selectedIcons, setSelectedIcons] = useState(() => lsLoad(LS_ICONS, ["Fragile","Keep Dry","This Way Up"]));

    /* ---- SETTINGS ---- */
    const [settings, setSettings] = useState(() => lsLoad(LS_SETTINGS, DEFAULT_SETTINGS));
    const setSetting = (key, val) => setSettings(s => ({ ...s, [key]: val }));
    const [tempWidth, setTempWidth] = useState(settings.labelWidth);
    const [tempHeight, setTempHeight] = useState(settings.labelHeight);
    const [sizeError, setSizeError] = useState("");
    /* ---- DESIGNS ---- */
    const [savedDesigns, setSavedDesigns] = useState(() => lsLoad(LS_DESIGNS, []));
    const [designName,   setDesignName]   = useState("");

    /* ---- COUNT ---- */
    const [countState, setCountState] = useState(() => lsLoad(LS_COUNT, DEFAULT_COUNT));
    const setCount = (key, val) => setCountState(cs => ({ ...cs, [key]: val }));

    /* ---- custom numbers text input mirror ---- */
    const [customInput, setCustomInput] = useState(
        () => (lsLoad(LS_COUNT, DEFAULT_COUNT).customNumbers || []).join(", ")
    );

    /* ============================================================
       DERIVED GRID
       ============================================================ */
    const { cols, rows, perPage } = computeGrid(settings.labelWidth, settings.labelHeight);
    const allSets      = buildSets(countState.total, perPage);
    const curSetIdx    = Math.max(0, allSets.findIndex(s => s.start === countState.currentBatchStart));
    const currentSet   = allSets[curSetIdx] || { start: 1, end: perPage };

    /* ============================================================
       PERSIST TO LOCALSTORAGE
       ============================================================ */
    useEffect(() => { lsSave(LS_FROM,     fromAddress);   }, [fromAddress]);
    useEffect(() => { lsSave(LS_TO_LIST,  toAddressList); }, [toAddressList]);
    useEffect(() => { lsSave(LS_PARCEL,   parcelDetails); }, [parcelDetails]);
    useEffect(() => { lsSave(LS_ICONS,    selectedIcons); }, [selectedIcons]);
    useEffect(() => { lsSave(LS_SETTINGS, settings);      }, [settings]);
    useEffect(() => { lsSave(LS_DESIGNS,  savedDesigns);  }, [savedDesigns]);
    useEffect(() => { lsSave(LS_COUNT,    countState);    }, [countState]);

    /* ============================================================
       TOAST
       ============================================================ */
    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 2600);
    };

    /* ============================================================
       PRINT — build label as pure HTML string (no DOM cloning)
       ============================================================ */
    const buildOneLabelHTML = (labelNumber) => {
        const s = settings;

        /* logo */
        const logoHTML = s.showLogo ? `
            <div style="width:100%;display:flex;justify-content:center;align-items:center;padding:2px 0;box-sizing:border-box;">
                <img src="${Logo}" alt="Logo" style="width:${s.logoWidth}%;max-width:100%;object-fit:contain;display:block;" />
            </div>` : "";

        /* hr */
        const hr = `<div style="width:100%;border-top:${s.hrWidth}px solid ${s.hrColor};margin:0;"></div>`;

        /* from */
        const fromLines = fromAddress.map(v =>
            `<span style="display:block;line-height:${s.lineHeight};">${v || "&nbsp;"}</span>`).join("");

        /* to */
        const toLines = toAddress.map(v =>
            `<span style="display:block;line-height:${s.lineHeight};">${v || "&nbsp;"}</span>`).join("");

        /* address row */
        const addrHTML = `
            <div style="width:100%;display:flex;justify-content:space-between;align-items:stretch;box-sizing:border-box;">
                <div style="width:50%;padding:2% ${s.addressPadding}%;border-right:1px solid #999;overflow-wrap:break-word;word-break:break-word;box-sizing:border-box;">
                    <div style="font-weight:700;text-transform:uppercase;margin-bottom:6px;font-size:${s.headingSize}px;color:${s.headingColor};">From</div>
                    <div style="font-size:${s.fontSize}px;">${fromLines}</div>
                </div>
                <div style="width:50%;padding:2% ${s.addressPadding}%;overflow-wrap:break-word;word-break:break-word;box-sizing:border-box;">
                    <div style="font-weight:700;text-transform:uppercase;margin-bottom:6px;font-size:${s.headingSize}px;color:${s.headingColor};">To</div>
                    <div style="font-size:${s.fontSize}px;">${toLines}</div>
                </div>
            </div>`;

        /* parcel table */
        const parcelRows = parcelDetails.map(item => `
            <tr>
                <td style="width:35%;font-weight:700;padding:2px 4px;vertical-align:top;overflow-wrap:break-word;word-break:break-word;">${item.label}</td>
                <td style="width:65%;padding:2px 4px;vertical-align:top;overflow-wrap:break-word;word-break:break-word;">: ${item.value}</td>
            </tr>`).join("");

        const parcelHTML = s.showParcelDetails ? `
            <div style="width:100%;padding:2% ${s.detailPadding}%;box-sizing:border-box;">
                <div style="font-weight:700;text-transform:uppercase;margin-bottom:6px;font-size:${s.headingSize}px;color:${s.headingColor};">Parcel Details</div>
                <table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tbody>${parcelRows}</tbody></table>
            </div>` : "";

        /* icons */
        const activeIcons = ICON_LIST.filter(item => selectedIcons.includes(item.name));
        const showCount   = s.showIcons && countState.showCountIcon && labelNumber !== null;
        const totalSlots  = activeIcons.length + (showCount ? 1 : 0);

        const iconBoxStyle = `flex:1;min-width:0;border:1px solid #d1d5db;background:white;padding:6px;
            display:flex;justify-content:center;align-items:center;flex-direction:column;
            text-align:center;overflow:hidden;border-radius:${s.iconBorderRadius}px;box-sizing:border-box;`;

        const iconBoxes = activeIcons.map(item => `
            <div style="${iconBoxStyle}">
                <img src="${item.icon}" alt="${item.name}" style="width:${s.iconSize}mm;height:${s.iconSize}mm;object-fit:contain;display:block;" />
                <div style="margin-top:4px;font-size:${s.iconTextSize}px;font-weight:700;text-transform:uppercase;overflow-wrap:break-word;word-break:break-word;">${item.name}</div>
            </div>`).join("");

        const countBox = showCount ? `
            <div style="${iconBoxStyle}">
                <div style="font-size:${Math.round(s.iconSize * 3.78 * 0.85)}px;font-weight:900;line-height:1;color:#1a1a1a;letter-spacing:-1px;">
                    ${String(labelNumber).padStart(2, "0")}
                </div>
                <div style="margin-top:5px;font-size:${s.iconTextSize}px;font-weight:600;color:#6b7280;letter-spacing:0.02em;">
                    out of ${countState.total}
                </div>
            </div>` : "";

        const iconsHTML = (s.showIcons && totalSlots > 0) ? `
            <div style="width:100%;display:flex;flex-direction:row;gap:${s.iconGap}px;align-items:stretch;box-sizing:border-box;">
                ${iconBoxes}${countBox}
            </div>` : "";

        /* outer label wrapper */
        return `
            <div style="width:${s.labelWidth}mm;height:${s.labelHeight}mm;background:${s.labelBg};
                        font-family:${s.fontFamily},Arial,sans-serif;color:${s.fontColor};
                        font-size:${s.fontSize}px;overflow:hidden;display:flex;
                        justify-content:center;align-items:center;box-sizing:border-box;">
                <div style="width:100%;height:100%;display:flex;flex-direction:column;
                            justify-content:space-evenly;overflow:hidden;
                            padding:${s.containerPadding}mm;
                            border:${s.borderWidth}px solid ${s.borderColor};
                            border-radius:${s.borderRadius}px;
                            gap:${s.sectionGap}px;
                            line-height:${s.lineHeight};
                            letter-spacing:${s.letterSpacing}px;
                            box-sizing:border-box;">
                    ${logoHTML}${hr}${addrHTML}${hr}${parcelHTML}${hr}${iconsHTML}
                </div>
            </div>`;
    };

    /* ---- open print window with given label numbers ---- */
    const doPrint = (labelNumbers) => {
        const lw = Math.max(10, Number(settings.labelWidth));
        const lh = Math.max(10, Number(settings.labelHeight));
        const { cols: c, perPage: pp } = computeGrid(lw, lh);

        /* pad to full page with blanks */
        let cells = [...labelNumbers];
        const rem = cells.length % pp;
        if (rem !== 0) for (let i = 0; i < pp - rem; i++) cells.push(null);

        const labelsHTML = cells.map(num =>
            num === null
                ? `<div class="pc"></div>`
                : `<div class="pc">${buildOneLabelHTML(num)}</div>`
        ).join("");

        const pw = window.open("", "", "width=1200,height=900");
        pw.document.write(`<!DOCTYPE html><html><head><title>Print</title>
            <style>
                @page{size:A4;margin:5mm;}
                *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
                body{background:white;}
                .sheet{width:200mm;display:grid;grid-template-columns:repeat(${c},${lw}mm);grid-auto-rows:${lh}mm;}
                .pc{width:${lw}mm;height:${lh}mm;overflow:hidden;page-break-inside:avoid;}
                img{max-width:100%;}
            </style></head>
            <body><div class="sheet">${labelsHTML}</div></body></html>`);
        pw.document.close();
        setTimeout(() => pw.print(), 500);
    };

    /* ---- Sequential: advance batch after each print ---- */
    const printSequential = () => {
        const set  = currentSet;
        const nums = [];
        for (let n = set.start; n <= set.end; n++) nums.push(n);
        doPrint(nums);
        /* advance to next batch (wraps to 1) */
        const nextIdx   = (curSetIdx + 1) % allSets.length;
        const nextStart = allSets[nextIdx].start;
        setCountState(cs => ({ ...cs, currentBatchStart: nextStart }));
        showToast(`Printed labels ${set.start}–${set.end}`);
    };

    /* ---- Set mode: print whichever set is selected ---- */
    const printSet = () => {
        const idx = countState.selectedSet ?? 0;
        const set = allSets[idx];
        if (!set) { showToast("No set selected","error"); return; }
        const nums = [];
        for (let n = set.start; n <= set.end; n++) nums.push(n);
        doPrint(nums);
        showToast(`Printed labels ${set.start}–${set.end}`);
    };

    /* ---- Custom mode: print only the hand-picked numbers ---- */
    const printCustom = () => {
        const nums = countState.customNumbers.filter(n => n >= 1 && n <= countState.total);
        if (nums.length === 0) { showToast("No valid numbers selected","error"); return; }
        doPrint(nums);
        showToast(`Printed labels: ${nums.join(", ")}`);
    };

    /* ---- Master print handler ---- */
    const handlePrint = () => {
        if      (countState.mode === "sequential") printSequential();
        else if (countState.mode === "set")        printSet();
        else if (countState.mode === "custom")     printCustom();
    };

    /* ---- Label text for the print button ---- */
    const printBtnLabel = () => {
        if (countState.mode === "sequential") {
            return `Print (${currentSet.start}–${currentSet.end})`;
        }
        if (countState.mode === "set") {
            const set = allSets[countState.selectedSet ?? 0];
            return set ? `Print (${set.start}–${set.end})` : "Print";
        }
        if (countState.mode === "custom") {
            const n = countState.customNumbers;
            if (!n.length) return "Print (none selected)";
            if (n.length <= 5) return `Print (${n.join(", ")})`;
            return `Print (${n.slice(0,4).join(", ")} +${n.length-4})`;
        }
        return "Print";
    };

    /* ---- Parse custom numbers from free-text field ---- */
    const parseCustomNumbers = (str) => {
        const nums = str.split(/[\s,]+/)
            .map(v => parseInt(v, 10))
            .filter(v => !isNaN(v) && v >= 1 && v <= countState.total);
        const unique = [...new Set(nums)].sort((a, b) => a - b);
        setCount("customNumbers", unique);
        return unique;
    };

    /* ============================================================
       FROM ADDRESS
       ============================================================ */
    const updateFrom    = (i,v) => { const u=[...fromAddress]; u[i]=v; setFromAddress(u); };
    const addFromLine   = ()    => { if (fromAddress.length < 6) setFromAddress([...fromAddress,""]); };
    const removeFromLine= (i)   => setFromAddress(fromAddress.filter((_,idx) => idx !== i));
    const saveFrom      = ()    => { setFromSaved([...fromAddress]); lsSave(LS_FROM, fromAddress); showToast("From address saved!"); };
    const revertFrom    = ()    => { setFromAddress([...fromSaved]); showToast("Reverted to saved address","info"); };

    /* ============================================================
       TO ADDRESS
       ============================================================ */
    const updateTo      = (i,v) => { const u=[...toAddress]; u[i]=v; setToAddress(u); };
    const addToLine     = ()    => { if (toAddress.length < 6) setToAddress([...toAddress,""]); };
    const removeToLine  = (i)   => setToAddress(toAddress.filter((_,idx) => idx !== i));
    const selectTo      = (idx) => { setActiveToIndex(idx); setToAddress([...toAddressList[idx]]); setShowToManager(false); };
    const saveTo        = ()    => {
        const u=[...toAddressList]; u[activeToIndex]=[...toAddress]; setToAddressList(u); showToast("To address saved!");
    };
    const addNewTo      = ()    => {
        const lines = newToName.trim() ? [newToName.trim()] : ["New Address"];
        const u = [...toAddressList, lines];
        setToAddressList(u); setActiveToIndex(u.length-1); setToAddress(lines); setNewToName(""); showToast("New address added");
    };
    const deleteTo      = (idx) => {
        if (toAddressList.length <= 1) { showToast("Need at least one address","error"); return; }
        const u  = toAddressList.filter((_,i) => i !== idx);
        const ni = Math.min(activeToIndex, u.length-1);
        setToAddressList(u); setActiveToIndex(ni); setToAddress([...u[ni]]);
    };

    /* ============================================================
       PARCEL
       ============================================================ */
    const updateParcel = (i,f,v) => { const u=[...parcelDetails]; u[i]={...u[i],[f]:v}; setParcelDetails(u); };
    const addParcel    = ()      => setParcelDetails([...parcelDetails, {label:"",value:""}]);
    const removeParcel = (i)     => setParcelDetails(parcelDetails.filter((_,idx) => idx !== i));

    /* ============================================================
       ICONS
       ============================================================ */
    const toggleIcon = (name) => {
        if (selectedIcons.includes(name)) {
            setSelectedIcons(selectedIcons.filter(i => i !== name));
        } else {
            if (selectedIcons.length >= 3) { showToast("Max 3 icons","error"); return; }
            setSelectedIcons([...selectedIcons, name]);
        }
    };

    /* ============================================================
       DESIGNS
       ============================================================ */
    const saveDesign   = () => {
        const name = designName.trim() || `Design ${savedDesigns.length + 1}`;
        setSavedDesigns([...savedDesigns, {
            id: Date.now(), name,
            fromAddress, toAddressList, activeToIndex, toAddress,
            parcelDetails, selectedIcons, settings, countState,
        }]);
        setDesignName("");
        showToast(`Design "${name}" saved!`);
    };
    const loadDesign   = (d) => {
        setFromAddress(d.fromAddress); setToAddressList(d.toAddressList);
        setActiveToIndex(d.activeToIndex); setToAddress(d.toAddress);
        setParcelDetails(d.parcelDetails); setSelectedIcons(d.selectedIcons);
        setSettings(d.settings); if (d.countState) setCountState(d.countState);
        showToast(`Loaded "${d.name}"`);
    };
    const deleteDesign = (id) => setSavedDesigns(savedDesigns.filter(d => d.id !== id));

    /* ============================================================
       RENDER
       ============================================================ */
    const SECTIONS = [
        { id:"from",     label:"From"     },
        { id:"to",       label:"To"       },
        { id:"parcel",   label:"Parcel"   },
        { id:"icons",    label:"Icons"    },
        { id:"count",    label:"Count"    },
        { id:"design",   label:"Design"   },
        { id:"advanced", label:"Advanced" },
    ];

    /* preview icon col count */
    const activeIconCount = ICON_LIST.filter(i => selectedIcons.includes(i.name)).length;
    const totalPreviewIconCols = activeIconCount + (countState.showCountIcon ? 1 : 0);

    return (
        <div className="label-area">

            {/* TOAST */}
            {toast && <div className={`label-toast label-toast--${toast.type}`}>{toast.msg}</div>}

            {/* ====================================================
                LEFT — PREVIEW
                ==================================================== */}
            <div className="label-area-left">

                <button className="print-btn" onClick={handlePrint}>
                    🖨&nbsp; {printBtnLabel()}
                </button>

                {/* LABEL PREVIEW */}
                <div className="label-preview" style={{
                    width:      `${settings.labelWidth}mm`,
                    height:     `${settings.labelHeight}mm`,
                    background: settings.labelBg,
                    fontFamily: settings.fontFamily,
                    color:      settings.fontColor,
                    fontSize:   `${settings.fontSize}px`,
                }}>
                    <div className="label-preview-cont" style={{
                        padding:       `${settings.containerPadding}mm`,
                        border:        `${settings.borderWidth}px solid ${settings.borderColor}`,
                        borderRadius:  `${settings.borderRadius}px`,
                        gap:           `${settings.sectionGap}px`,
                        lineHeight:    settings.lineHeight,
                        letterSpacing: `${settings.letterSpacing}px`,
                    }}>
                        {/* LOGO */}
                        {settings.showLogo && (
                            <div className="label-preview-logo-cont">
                                <div className="label-preview-logo">
                                    <img src={Logo} alt="Logo" style={{ width:`${settings.logoWidth}%` }} />
                                </div>
                            </div>
                        )}

                        <hr style={{ borderColor:settings.hrColor, borderTopWidth:`${settings.hrWidth}px` }} />

                        {/* ADDRESS ROW */}
                        <div className="label-preview-row2" style={{ gap:`${settings.addressGap}px` }}>
                            <div className="label-preview-from" style={{ padding:`2% ${settings.addressPadding}%` }}>
                                <p className="label-preview-header" style={{ fontSize:`${settings.headingSize}px`, color:settings.headingColor }}>From</p>
                                <p>{fromAddress.map((v,i) => <span key={i}>{v}<br /></span>)}</p>
                            </div>
                            <div className="label-preview-to" style={{ padding:`2% ${settings.addressPadding}%` }}>
                                <p className="label-preview-header" style={{ fontSize:`${settings.headingSize}px`, color:settings.headingColor }}>To</p>
                                <p>{toAddress.map((v,i) => <span key={i}>{v}<br /></span>)}</p>
                            </div>
                        </div>

                        <hr style={{ borderColor:settings.hrColor, borderTopWidth:`${settings.hrWidth}px` }} />

                        {/* PARCEL */}
                        {settings.showParcelDetails && (
                            <div className="label-preview-data" style={{ padding:`2% ${settings.detailPadding}%` }}>
                                <p className="label-preview-header" style={{ fontSize:`${settings.headingSize}px`, color:settings.headingColor }}>Parcel Details</p>
                                <table className="label-table"><tbody>
                                    {parcelDetails.map((item,i) => (
                                        <tr key={i}>
                                            <td className="label-key">{item.label}</td>
                                            <td className="label-value">: {item.value}</td>
                                        </tr>
                                    ))}
                                </tbody></table>
                            </div>
                        )}

                        <hr style={{ borderColor:settings.hrColor, borderTopWidth:`${settings.hrWidth}px` }} />

                        {/* ICONS */}
                        {settings.showIcons && totalPreviewIconCols > 0 && (
                            <div className="label-preview-icon"
                                style={{ gridTemplateColumns:`repeat(${totalPreviewIconCols},1fr)`, gap:`${settings.iconGap}px` }}>

                                {ICON_LIST.filter(item => selectedIcons.includes(item.name)).map((item,i) => (
                                    <div className="label-preview-icon-box" key={i}
                                        style={{ borderRadius:`${settings.iconBorderRadius}px` }}>
                                        <img src={item.icon} alt={item.name}
                                            style={{ width:`${settings.iconSize}mm`, height:`${settings.iconSize}mm` }} />
                                        <p style={{ fontSize:`${settings.iconTextSize}px` }}>{item.name}</p>
                                    </div>
                                ))}

                                {/* COUNT ICON IN PREVIEW */}
                                {countState.showCountIcon && (
                                    <div className="label-preview-icon-box count-icon-box"
                                        style={{ borderRadius:`${settings.iconBorderRadius}px` }}>
                                        <div className="count-icon-number"
                                            style={{ fontSize:`${Math.round(settings.iconSize*3.78*0.85)}px` }}>
                                            {String(currentSet.start).padStart(2,"0")}
                                        </div>
                                        <p className="count-icon-sub" style={{ fontSize:`${settings.iconTextSize}px` }}>
                                            out of {countState.total}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* STATUS CHIPS */}
                <div className="label-status-bar">
                    <span className="status-chip">{settings.labelWidth}×{settings.labelHeight}mm</span>
                    <span className="status-chip">{cols}×{rows} = {perPage}/page</span>
                    <span className="status-chip status-chip--blue">{currentSet.start}–{currentSet.end} of {countState.total}</span>
                </div>
            </div>

            {/* ====================================================
                RIGHT — EDITOR
                ==================================================== */}
            <div className="label-area-right">

                {/* TAB NAV */}
                <div className="editor-nav">
                    {SECTIONS.map(s => (
                        <button key={s.id}
                            className={`editor-nav-btn${activeSection===s.id?" active":""}`}
                            onClick={() => setActiveSection(s.id)}>
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="label-editor">

                    {/* ===================== FROM ===================== */}
                    {activeSection==="from" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title">{/*<span className="editor-section-icon">📍</span>*/}<h3>From Address</h3></div>
                                <p className="editor-section-hint">Saved address is reused across sessions.</p>
                            </div>
                            {fromAddress.map((v,i) => (
                                <div className="editor-row" key={i}>
                                    <input type="text" placeholder={i===0?"Company / Name":`Line ${i+1}`}
                                        value={v} onChange={e=>updateFrom(i,e.target.value)} />
                                    <button className="remove-btn" onClick={()=>removeFromLine(i)}>✕</button>
                                </div>
                            ))}
                            <div className="editor-btn-group">
                                <button className="secondary-btn" onClick={addFromLine} disabled={fromAddress.length>=6}>+ Add Line</button>
                                <button className="revert-btn"    onClick={revertFrom}>↩ Revert</button>
                                <button className="save-address-btn" onClick={saveFrom}>Save</button>
                            </div>
                        </div>
                    )}

                    {/* ===================== TO ===================== */}
                    {activeSection==="to" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title">{/*<span className="editor-section-icon">📦</span>*/}<h3>To Address</h3></div>
                                <p className="editor-section-hint">Active: <strong>{toAddressList[activeToIndex]?.[0]||"–"}</strong></p>
                            </div>

                            {/* ADDRESS MANAGER */}
                            <div className="to-address-picker">
                                <button className="to-manager-toggle" onClick={()=>setShowToManager(v=>!v)}>
                                    {showToManager?"Hide":"Manage"} Saved Addresses ({toAddressList.length})
                                </button>
                                {showToManager && (
                                    <div className="to-manager">
                                        {toAddressList.map((addr,idx) => (
                                            <div className={`to-address-card${idx===activeToIndex?" active":""}`} key={idx}>
                                                <div className="to-address-card-text" onClick={()=>selectTo(idx)}>
                                                    <span className="to-address-name">{addr[0]}</span>
                                                    <span className="to-address-preview">{addr.slice(1).join(", ")}</span>
                                                </div>
                                                <button className="to-address-delete" onClick={()=>deleteTo(idx)}>✕</button>
                                            </div>
                                        ))}
                                        <div className="to-add-new">
                                            <input type="text" placeholder="New address name..."
                                                value={newToName} onChange={e=>setNewToName(e.target.value)}
                                                onKeyDown={e=>e.key==="Enter"&&addNewTo()} />
                                            <button className="secondary-btn" onClick={addNewTo}>+ New</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {toAddress.map((v,i) => (
                                <div className="editor-row" key={i}>
                                    <input type="text" placeholder={i===0?"Company / Name":`Line ${i+1}`}
                                        value={v} onChange={e=>updateTo(i,e.target.value)} />
                                    <button className="remove-btn" onClick={()=>removeToLine(i)}>✕</button>
                                </div>
                            ))}
                            <div className="editor-btn-group">
                                <button className="secondary-btn" onClick={addToLine} disabled={toAddress.length>=6}>+ Add Line</button>
                                <button className="save-address-btn" onClick={saveTo}>Save This Address</button>
                            </div>
                        </div>
                    )}

                    {/* ===================== PARCEL ===================== */}
                    {activeSection==="parcel" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title"><h3>Parcel Details</h3></div>
                            </div>
                            {parcelDetails.map((item,i) => (
                                <div className="parcel-detail-box" key={i}>
                                    <input type="text" placeholder="Label (e.g. Weight)" value={item.label}
                                        onChange={e=>updateParcel(i,"label",e.target.value)} />
                                    <input type="text" placeholder="Value (e.g. 5kg)" value={item.value}
                                        onChange={e=>updateParcel(i,"value",e.target.value)} />
                                    <button className="remove-btn full-width" onClick={()=>removeParcel(i)}>✕ Remove</button>
                                </div>
                            ))}
                            <button className="secondary-btn mt-4" onClick={addParcel}>+ Add Field</button>
                            <label className="toggle-row">
                                <input type="checkbox" checked={settings.showParcelDetails}
                                    onChange={e=>setSetting("showParcelDetails",e.target.checked)} />
                                <span>Show Parcel Details on Label</span>
                            </label>
                        </div>
                    )}

                    {/* ===================== ICONS ===================== */}
                    {activeSection==="icons" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title"><h3>Icons</h3></div>
                                <p className="editor-section-hint">Select up to 3 shipping icons. Count icon is separate.</p>
                            </div>

                            <div className="icon-grid">
                                {/* NORMAL ICONS */}
                                {ICON_LIST.map((item,i) => {
                                    const checked = selectedIcons.includes(item.name);
                                    return (
                                        <label className={`icon-card${checked?" icon-card--active":""}`} key={i}>
                                            <input type="checkbox" checked={checked} onChange={()=>toggleIcon(item.name)} />
                                            <img src={item.icon} alt={item.name} />
                                            <span>{item.name}</span>
                                        </label>
                                    );
                                })}

                                {/* COUNT ICON CARD */}
                                <label className={`icon-card icon-card--count${countState.showCountIcon?" icon-card--active":""}`}>
                                    <input type="checkbox"
                                        checked={countState.showCountIcon}
                                        onChange={e=>setCount("showCountIcon",e.target.checked)} />
                                    <div className="count-icon-preview">
                                        <div className="count-icon-preview-num">
                                            {String(currentSet.start).padStart(2,"0")}
                                        </div>
                                        <div className="count-icon-preview-sub">out of {countState.total}</div>
                                    </div>
                                    <span>Count</span>
                                </label>
                            </div>

                            <label className="toggle-row mt-8">
                                <input type="checkbox" checked={settings.showIcons}
                                    onChange={e=>setSetting("showIcons",e.target.checked)} />
                                <span>Show Icons on Label</span>
                            </label>
                        </div>
                    )}

                    {/* ===================== COUNT ===================== */}
                    {activeSection==="count" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title"><h3>Label Count</h3></div>
                                <p className="editor-section-hint">Set total labels, track batches, or pick individual numbers.</p>
                            </div>

                            {/* TOTAL COUNT */}
                            <div className="settings-group">
                                <h4 className="settings-group-title">Total Labels</h4>
                                <div className="setting-item">
                                    <label>Total Count</label>
                                    <input type="number" min="1" max="9999"
                                        value={countState.total}
                                        onChange={e => {
                                            const v = Math.max(1, parseInt(e.target.value)||1);
                                            setCountState(cs => ({
                                                ...cs,
                                                total: v,
                                                currentBatchStart: 1,
                                                customNumbers: cs.customNumbers.filter(n => n <= v),
                                            }));
                                        }} />
                                </div>

                                {/* INFO GRID */}
                                <div className="count-info-grid">
                                    <div className="count-info-cell">
                                        <span className="count-info-val">{perPage}</span>
                                        <span className="count-info-lbl">per page</span>
                                    </div>
                                    <div className="count-info-cell">
                                        <span className="count-info-val">{allSets.length}</span>
                                        <span className="count-info-lbl">total pages</span>
                                    </div>
                                    <div className="count-info-cell">
                                        <span className="count-info-val count-info-val--blue">
                                            {currentSet.start}–{currentSet.end}
                                        </span>
                                        <span className="count-info-lbl">next batch</span>
                                    </div>
                                </div>
                            </div>

                            {/* PRINT MODE SELECTOR */}
                            <div className="settings-group">
                                <h4 className="settings-group-title">Print Mode</h4>
                                <div className="mode-selector">
                                    {[
                                        { id:"sequential", icon:"▶",  label:"Sequential", desc:"Auto-advance batch — wraps back to start" },
                                        { id:"set",        icon:"📋", label:"Pick a Set",  desc:"Choose which page-set to re-print"       },
                                        { id:"custom",     icon:"✏️", label:"Custom Nums", desc:"Hand-pick individual label numbers"       },
                                    ].map(m => (
                                        <label key={m.id} className={`mode-card${countState.mode===m.id?" mode-card--active":""}`}>
                                            <input type="radio" name="cmode" value={m.id}
                                                checked={countState.mode===m.id}
                                                onChange={()=>setCount("mode",m.id)} />
                                            <span className="mode-icon">{m.icon}</span>
                                            <div className="mode-text">
                                                <span className="mode-label">{m.label}</span>
                                                <span className="mode-desc">{m.desc}</span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* ---- SEQUENTIAL DETAILS ---- */}
                            {countState.mode==="sequential" && (
                                <div className="settings-group">
                                    <h4 className="settings-group-title">Sequential Progress</h4>

                                    {/* progress bar */}
                                    <div className="count-progress-track">
                                        <div className="count-progress-fill"
                                            style={{ width:`${Math.min(100,(curSetIdx/Math.max(1,allSets.length))*100)}%` }} />
                                    </div>
                                    <p className="count-progress-label">
                                        Set {curSetIdx+1} of {allSets.length} — Labels {currentSet.start}–{currentSet.end}
                                    </p>

                                    {/* all sets overview */}
                                    <div className="set-list">
                                        {allSets.map((set,idx) => (
                                            <div key={idx}
                                                className={`set-chip${idx===curSetIdx?" set-chip--active":""}`}>
                                                <span>{set.start}–{set.end}</span>
                                                {idx===curSetIdx  && <span className="set-chip-badge">Next</span>}
                                                {idx < curSetIdx  && <span className="set-chip-badge set-chip-badge--done">✓</span>}
                                            </div>
                                        ))}
                                    </div>

                                    <button className="secondary-btn"
                                        onClick={() => { setCountState(cs=>({...cs,currentBatchStart:1})); showToast("Batch reset","info"); }}>
                                        ↺ Reset to Start
                                    </button>
                                </div>
                            )}

                            {/* ---- SET MODE DETAILS ---- */}
                            {countState.mode==="set" && (
                                <div className="settings-group">
                                    <h4 className="settings-group-title">Select a Set to Print</h4>
                                    <p className="editor-section-hint" style={{margin:0}}>
                                        Click any set below. The print button will print exactly those labels.
                                    </p>

                                    <div className="set-grid">
                                        {allSets.map((set,idx) => (
                                            <button key={idx}
                                                className={`set-btn${countState.selectedSet===idx?" set-btn--active":""}`}
                                                onClick={()=>setCount("selectedSet",idx)}>
                                                <span className="set-btn-range">{set.start}–{set.end}</span>
                                                <span className="set-btn-count">{set.end-set.start+1} label{set.end-set.start+1!==1?"s":""}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {countState.selectedSet !== null && allSets[countState.selectedSet] && (
                                        <div className="set-selected-info">
                                            Selected: Labels {allSets[countState.selectedSet].start}–{allSets[countState.selectedSet].end}
                                            &nbsp;({allSets[countState.selectedSet].end - allSets[countState.selectedSet].start + 1} labels)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ---- CUSTOM MODE DETAILS ---- */}
                            {countState.mode==="custom" && (
                                <div className="settings-group">
                                    <h4 className="settings-group-title">Pick Individual Numbers</h4>
                                    <p className="editor-section-hint" style={{margin:0}}>
                                        Type numbers (1–{countState.total}) or tap them below.
                                    </p>

                                    <textarea
                                        className="custom-numbers-input"
                                        placeholder={`e.g. 4, 6, 9`}
                                        value={customInput}
                                        rows={2}
                                        onChange={e => {
                                            setCustomInput(e.target.value);
                                            parseCustomNumbers(e.target.value);
                                        }}
                                    />

                                    {/* NUMBER GRID */}
                                    <div className="custom-number-grid">
                                        {Array.from({ length: countState.total }, (_,i) => i+1).map(n => (
                                            <button key={n}
                                                className={`custom-num-btn${countState.customNumbers.includes(n)?" custom-num-btn--active":""}`}
                                                onClick={() => {
                                                    const cur  = countState.customNumbers;
                                                    const next = cur.includes(n)
                                                        ? cur.filter(x=>x!==n)
                                                        : [...cur,n].sort((a,b)=>a-b);
                                                    setCount("customNumbers", next);
                                                    setCustomInput(next.join(", "));
                                                }}>
                                                {n}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="editor-btn-group">
                                        <button className="secondary-btn" onClick={()=>{setCount("customNumbers",[]); setCustomInput("");}}>
                                            Clear All
                                        </button>
                                        <button className="secondary-btn" onClick={()=>{
                                            const all = Array.from({length:countState.total},(_,i)=>i+1);
                                            setCount("customNumbers",all); setCustomInput(all.join(", "));
                                        }}>Select All</button>
                                    </div>

                                    {countState.customNumbers.length > 0 && (
                                        <div className="custom-selected-info">
                                            <strong>{countState.customNumbers.length}</strong> label{countState.customNumbers.length!==1?"s":""} selected:&nbsp;
                                            {countState.customNumbers.length <= 12
                                                ? countState.customNumbers.join(", ")
                                                : countState.customNumbers.slice(0,12).join(", ") + ` +${countState.customNumbers.length-12} more`}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===================== DESIGN ===================== */}
                    {activeSection==="design" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title"><h3>Saved Designs</h3></div>
                                <p className="editor-section-hint">Save the full label state and reload anytime.</p>
                            </div>
                            <div className="design-save-row">
                                <input type="text" placeholder="Design name..."
                                    value={designName} onChange={e=>setDesignName(e.target.value)}
                                    onKeyDown={e=>e.key==="Enter"&&saveDesign()} />
                                <button className="save-address-btn" onClick={saveDesign}>Save</button>
                            </div>
                            {savedDesigns.length===0 ? (
                                <p className="empty-state">No saved designs yet.</p>
                            ) : (
                                <div className="design-list">
                                    {savedDesigns.map(d => (
                                        <div className="design-card" key={d.id}>
                                            <div className="design-card-info">
                                                <span className="design-name">{d.name}</span>
                                                <span className="design-meta">{d.settings.labelWidth}×{d.settings.labelHeight}mm</span>
                                            </div>
                                            <div className="design-card-actions">
                                                <button className="load-btn" onClick={()=>loadDesign(d)}>Load</button>
                                                <button className="remove-btn" onClick={()=>deleteDesign(d.id)}>✕</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ===================== ADVANCED ===================== */}
                    {activeSection==="advanced" && (
                        <div className="editor-section">
                            <div className="editor-section-header">
                                <div className="editor-section-title"><h3>Advanced Settings</h3></div>
                            </div>

                            <div className="settings-group">

                                <h4 className="settings-group-title">Label Size</h4>

                                <div className="settings-grid-2">

                                    {/* WIDTH */}
                                    <div className="setting-item">
                                        <label>Width (mm)</label>

                                        <input
                                            type="number"
                                            min="40"
                                            max="200"
                                            value={tempWidth}
                                            onChange={(e) => setTempWidth(e.target.value)}
                                        />
                                    </div>

                                    {/* HEIGHT */}
                                    <div className="setting-item">
                                        <label>Height (mm)</label>

                                        <input
                                            type="number"
                                            min="40"
                                            max="160"
                                            value={tempHeight}
                                            onChange={(e) => setTempHeight(e.target.value)}
                                        />
                                    </div>

                                    {/* BACKGROUND */}
                                    <div className="setting-item">
                                        <label>Background</label>

                                        <input
                                            type="color"
                                            value={settings.labelBg}
                                            onChange={e=>setSetting("labelBg",e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* ERROR MESSAGE */}
                                {sizeError && (
                                    <div className="custom-selected-info">
                                        {sizeError}
                                    </div>
                                )}

                                {/* SET BUTTON */}
                                <button
                                    className="save-address-btn"
                                    onClick={() => {

                                        let width = Number(tempWidth);
                                        let height = Number(tempHeight);

                                        let errorText = "";

                                        /* WIDTH LIMIT */
                                        if (width > 200) {
                                            width = 200;
                                            errorText += "Width limit exceeded. Set to max 200mm. ";
                                        }

                                        if (width < 40) {
                                            width = 40;
                                            errorText += "Width too small. Set to min 40mm. ";
                                        }

                                        /* HEIGHT LIMIT */
                                        if (height > 160) {
                                            height = 160;
                                            errorText += "Height limit exceeded. Set to max 160mm. ";
                                        }

                                        if (height < 40) {
                                            height = 40;
                                            errorText += "Height too small. Set to min 40mm.";
                                        }

                                        /* UPDATE INPUTS */
                                        setTempWidth(width);
                                        setTempHeight(height);

                                        /* APPLY SETTINGS */
                                        setSetting("labelWidth", width);
                                        setSetting("labelHeight", height);

                                        /* MESSAGE */
                                        if (errorText) {
                                            setSizeError(errorText);
                                        } else {
                                            setSizeError("Size updated successfully.");
                                        }
                                    }}
                                >
                                    Set Size
                                </button>

                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Typography</h4>
                                <div className="setting-item"><label>Font Family</label>
                                    <select value={settings.fontFamily} onChange={e=>setSetting("fontFamily",e.target.value)}>
                                        {FONT_OPTIONS.map(f=><option key={f}>{f}</option>)}
                                    </select></div>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Body (px)</label>
                                        <input type="number" value={settings.fontSize} onChange={e=>setSetting("fontSize",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Heading (px)</label>
                                        <input type="number" value={settings.headingSize} onChange={e=>setSetting("headingSize",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Font Color</label>
                                        <input type="color" value={settings.fontColor} onChange={e=>setSetting("fontColor",e.target.value)} /></div>
                                    <div className="setting-item"><label>Heading Color</label>
                                        <input type="color" value={settings.headingColor} onChange={e=>setSetting("headingColor",e.target.value)} /></div>
                                    <div className="setting-item"><label>Line Height</label>
                                        <input type="number" step="0.1" value={settings.lineHeight} onChange={e=>setSetting("lineHeight",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Letter Spacing</label>
                                        <input type="number" step="0.1" value={settings.letterSpacing} onChange={e=>setSetting("letterSpacing",Number(e.target.value))} /></div>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Border</h4>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Width (px)</label>
                                        <input type="number" value={settings.borderWidth} onChange={e=>setSetting("borderWidth",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Radius (px)</label>
                                        <input type="number" value={settings.borderRadius} onChange={e=>setSetting("borderRadius",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Color</label>
                                        <input type="color" value={settings.borderColor} onChange={e=>setSetting("borderColor",e.target.value)} /></div>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Spacing</h4>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Section Gap</label>
                                        <input type="number" value={settings.sectionGap} onChange={e=>setSetting("sectionGap",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Container Pad (mm)</label>
                                        <input type="number" value={settings.containerPadding} onChange={e=>setSetting("containerPadding",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Address Pad</label>
                                        <input type="number" value={settings.addressPadding} onChange={e=>setSetting("addressPadding",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Detail Pad</label>
                                        <input type="number" value={settings.detailPadding} onChange={e=>setSetting("detailPadding",Number(e.target.value))} /></div>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Divider (HR)</h4>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Thickness (px)</label>
                                        <input type="number" value={settings.hrWidth} onChange={e=>setSetting("hrWidth",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Color</label>
                                        <input type="color" value={settings.hrColor} onChange={e=>setSetting("hrColor",e.target.value)} /></div>
                                </div>
                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Logo</h4>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Width (%)</label>
                                        <input type="number" value={settings.logoWidth} onChange={e=>setSetting("logoWidth",Number(e.target.value))} /></div>
                                </div>
                                <label className="toggle-row">
                                    <input type="checkbox" checked={settings.showLogo} onChange={e=>setSetting("showLogo",e.target.checked)} />
                                    <span>Show Logo</span>
                                </label>
                            </div>

                            <div className="settings-group">
                                <h4 className="settings-group-title">Icons</h4>
                                <div className="settings-grid-2">
                                    <div className="setting-item"><label>Icon Size (mm)</label>
                                        <input type="number" value={settings.iconSize} onChange={e=>setSetting("iconSize",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Icon Text (px)</label>
                                        <input type="number" value={settings.iconTextSize} onChange={e=>setSetting("iconTextSize",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Icon Gap (px)</label>
                                        <input type="number" value={settings.iconGap} onChange={e=>setSetting("iconGap",Number(e.target.value))} /></div>
                                    <div className="setting-item"><label>Icon Radius (px)</label>
                                        <input type="number" value={settings.iconBorderRadius} onChange={e=>setSetting("iconBorderRadius",Number(e.target.value))} /></div>
                                </div>
                            </div>

                            <button className="danger-btn"
                                onClick={()=>{ setSettings(DEFAULT_SETTINGS); showToast("Settings reset","info"); }}>
                                ↺ Reset to Default
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
