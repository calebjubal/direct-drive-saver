"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import {
  createDriveFolder,
  downloadDriveImage,
  listDriveContent,
  moveDriveItem,
  renameDriveItem,
  trashDriveItem,
  uploadDrivePhoto,
} from "./lib/drive";

const starterFolders = [
  { id: "root", name: "My Drive", parentId: null },
  { id: "photos", name: "Photos", parentId: "root" },
  { id: "receipts", name: "Receipts", parentId: "root" },
  { id: "projects", name: "Work projects", parentId: "root" },
  { id: "travel", name: "Travel", parentId: "photos" },
  { id: "family", name: "Family", parentId: "photos" },
];

const Icon = ({ name, size = 24, stroke = 1.9, className = "" }) => {
  const paths = {
    arrowLeft: <><path d="m15 18-6-6 6-6"/><path d="M9 12h12"/></>,
    camera: <><path d="M14.5 4H9.6L8 6H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4Z"/><circle cx="12" cy="13" r="4"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    chevron: <path d="m9 18 6-6-6-6"/>,
    close: <><path d="m6 6 12 12"/><path d="m18 6-12 12"/></>,
    dots: <><circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
    files: <><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h5"/></>,
    flash: <path d="m13 2-8 12h7l-1 8 8-12h-7Z"/>,
    flashOff: <><path d="m13 2-3.2 4.8"/><path d="m7 11.1-2 2.9h7l-1 8 5.3-8"/><path d="m16 7 3-4"/><path d="m3 3 18 18"/></>,
    folder: <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>,
    folderPlus: <><path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/><path d="M12 12v5M9.5 14.5h5"/></>,
    gallery: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>,
    grid: <><path d="M8 3v18M16 3v18M3 8h18M3 16h18"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/></>,
    location: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    move: <><path d="M5 9h14M5 15h14"/><path d="m15 5 4 4-4 4M9 11l-4 4 4 4"/></>,
    rotate: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-5"/></>,
    timer: <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
  };
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
};

function DriveMark({ size = 26 }) {
  return <svg width={size} height={size} viewBox="0 0 32 28" aria-hidden="true"><path fill="#0F9D58" d="M11 0h10l11 19-5 9H17l5-9Z"/><path fill="#F4B400" d="M11 0 0 19l5 9 11-19Z"/><path fill="#4285F4" d="M5 28h22l5-9H10Z"/></svg>;
}

function Modal({ title, children, onClose }) {
  return <div className="scrim" onMouseDown={onClose}><section className="sheet" onMouseDown={(e) => e.stopPropagation()}><div className="grabber"/><div className="sheet-title"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><Icon name="close" size={21}/></button></div>{children}</section></div>;
}

function Toggle({ checked, onChange, label }) {
  return <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`toggle ${checked ? "on" : ""}`}><span/></button>;
}

function DriveImage({ photo, providerToken, alt }) {
  const inlineSource = photo?.dataUrl?.startsWith("data:") ? photo.dataUrl : "";
  const [source, setSource] = useState(inlineSource);
  const [status, setStatus] = useState(inlineSource ? "ready" : "loading");

  useEffect(() => {
    if (inlineSource) {
      setSource(inlineSource);
      setStatus("ready");
      return undefined;
    }
    if (!photo?.id || !providerToken || photo.capabilities?.canDownload === false) {
      setSource("");
      setStatus("error");
      return undefined;
    }

    let active = true;
    let objectUrl = "";
    setSource("");
    setStatus("loading");
    void downloadDriveImage(providerToken, photo.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [inlineSource, photo?.capabilities?.canDownload, photo?.id, providerToken]);

  if (source) return <img src={source} alt={alt || photo.name}/>;
  const message = status === "error" ? `Could not load ${photo?.name || "image"}` : `Loading ${photo?.name || "image"}`;
  return <span className={`drive-image-placeholder ${status}`} role="img" aria-label={message} title={message}><Icon name="image" size={24}/></span>;
}

function LoginScreen({ onConnect, error }) {
  const [loading, setLoading] = useState(false);
  const connect = async () => {
    setLoading(true);
    try { await onConnect(); } finally { setLoading(false); }
  };
  return <div className="onboarding login-screen">
    <div className="onboarding-top"><div className="brand-mark"><Icon name="camera" size={31}/></div><span>DriveCam</span></div>
    <div className="login-art" aria-hidden="true"><div className="photo-card card-one"><div className="sun"/><div className="hill one"/><div className="hill two"/></div><div className="photo-card card-two"><DriveMark size={44}/></div><div className="flow-line"/><div className="flow-dot dot-a"/><div className="flow-dot dot-b"/><div className="flow-dot dot-c"/></div>
    <div className="onboarding-copy"><span className="eyebrow">YOUR CAMERA, YOUR DRIVE</span><h1>Snap it.<br/>Save it <em>your way.</em></h1><p>Capture photos and file them straight into the right Google Drive folder—no cleanup later.</p></div>
    <div className="login-actions">{error && <div className="auth-error">{error}</div>}<button className="google-button" onClick={connect} disabled={loading}><span className="google-g">G</span>{loading ? "Opening Google…" : "Continue with Google Drive"}</button><div className="privacy-note"><Icon name="shield" size={16}/><span>Your photos stay between you and your Drive.</span></div></div>
  </div>;
}

function FolderSetup({ folders, selectedId, onSelect, onContinue, onAdd }) {
  const visible = folders.filter((folder) => folder.parentId === "root");
  return <div className="onboarding setup-screen">
    <header className="simple-header"><button className="icon-btn"><Icon name="arrowLeft"/></button><div className="step-count">2 of 2</div><div className="avatar">C</div></header>
    <div className="setup-copy"><span className="eyebrow">ONE LAST THING</span><h1>Where should<br/>your photos land?</h1><p>Choose a Google Drive folder. You can always change this later.</p></div>
    <div className="drive-browser"><div className="drive-title"><span><DriveMark size={21}/> My Drive</span><button className="text-button" onClick={onAdd}><Icon name="folderPlus" size={19}/>New folder</button></div><div className="folder-list">{visible.map((folder) => <button key={folder.id} className={`folder-choice ${selectedId === folder.id ? "selected" : ""}`} onClick={() => onSelect(folder.id)}><span className="folder-icon"><Icon name="folder" size={22}/></span><span><b>{folder.name}</b><small>{folder.id === "photos" ? "24 items" : folder.id === "receipts" ? "8 items" : "3 items"}</small></span><span className="radio"><i/></span></button>)}</div></div>
    <div className="setup-footer"><div className="selected-copy"><span>Saving to</span><b><Icon name="folder" size={16}/>{folders.find(f => f.id === selectedId)?.name || "Choose a folder"}</b></div><button className="primary-round" onClick={onContinue} disabled={!selectedId}>Start capturing <Icon name="chevron" size={19}/></button></div>
  </div>;
}

function CameraScreen({ folder, reviewEnabled, onChangeFolder, onCapture, lastPhoto, providerToken }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraState, setCameraState] = useState("loading");
  const [facing, setFacing] = useState("environment");
  const [flash, setFlash] = useState(false);
  const [grid, setGrid] = useState(false);
  const [timer, setTimer] = useState(0);
  const [countdown, setCountdown] = useState(null);
  useEffect(() => {
    let active = true;
    const start = async () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      if (!navigator.mediaDevices?.getUserMedia) { setCameraState("unavailable"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing }, audio: false });
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCameraState("ready");
      } catch { if (active) setCameraState("blocked"); }
    };
    start();
    return () => { active = false; streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [facing]);
  const makePlaceholder = () => {
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 1200;
    const c = canvas.getContext("2d"); const g = c.createLinearGradient(0, 0, 900, 1200); g.addColorStop(0, "#375f69"); g.addColorStop(.5, "#d6a66b"); g.addColorStop(1, "#332c32"); c.fillStyle = g; c.fillRect(0,0,900,1200);
    c.fillStyle = "rgba(255,255,255,.12)"; c.beginPath(); c.arc(690,270,130,0,Math.PI*2); c.fill(); c.fillStyle = "#2d3940"; c.beginPath(); c.moveTo(0,840); c.lineTo(330,560); c.lineTo(570,850); c.lineTo(900,620); c.lineTo(900,1200); c.lineTo(0,1200); c.fill(); c.fillStyle = "rgba(255,255,255,.78)"; c.font = "600 36px system-ui"; c.fillText("DriveCam", 48, 1115); c.font = "28px system-ui"; c.fillText(new Date().toLocaleString(), 48, 1160); return canvas.toDataURL("image/jpeg", .88);
  };
  const captureNow = () => {
    let dataUrl = ""; const video = videoRef.current;
    if (cameraState === "ready" && video?.videoWidth) { const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight; canvas.getContext("2d").drawImage(video, 0, 0); dataUrl = canvas.toDataURL("image/jpeg", .9); } else dataUrl = makePlaceholder();
    onCapture(dataUrl);
  };
  const triggerCapture = () => { if (!timer) { captureNow(); return; } setCountdown(timer); let remaining = timer; const interval = setInterval(() => { remaining -= 1; if (remaining <= 0) { clearInterval(interval); setCountdown(null); captureNow(); } else setCountdown(remaining); }, 1000); };
  return <div className="camera-screen"><video ref={videoRef} className="camera-video" playsInline muted/><div className="camera-fallback"><div className="mock-sky"/><div className="mock-sun"/><div className="mock-mountain m1"/><div className="mock-mountain m2"/><div className="mock-road"/></div><div className="camera-shade top"/><div className="camera-shade bottom"/>
    <div className="camera-topbar"><button className={`glass-btn ${flash ? "active" : ""}`} onClick={() => setFlash(!flash)}><Icon name={flash ? "flash" : "flashOff"} size={21}/></button><button className={`glass-btn ${timer ? "active" : ""}`} onClick={() => setTimer(timer === 0 ? 3 : timer === 3 ? 10 : 0)}><Icon name="timer" size={21}/>{timer > 0 && <small>{timer}</small>}</button><button className={`glass-btn ${grid ? "active" : ""}`} onClick={() => setGrid(!grid)}><Icon name="grid" size={21}/></button><button className="glass-btn ratio">4:3</button></div>
    <button className="save-pill" onClick={onChangeFolder}><span><Icon name="folder" size={17}/><small>Saving to</small><b>{folder?.name || "My Drive"}</b></span><Icon name="chevron" size={18}/></button>{grid && <div className="viewfinder-grid"><i/><i/><i/><i/></div>}{countdown && <div className="countdown">{countdown}</div>}{cameraState !== "ready" && <div className="camera-status"><Icon name="camera" size={21}/><span>{cameraState === "loading" ? "Starting camera…" : "Camera preview unavailable — demo scene active"}</span></div>}
    <div className="zoom-row"><button className="zoom active">1×</button><button className="zoom">2</button><button className="zoom">5</button></div><div className="capture-bar"><button className="last-photo" aria-label="Open recent photos">{lastPhoto ? <DriveImage photo={lastPhoto} providerToken={providerToken} alt="Latest capture"/> : <Icon name="gallery" size={23}/>}</button><button className="shutter" onClick={triggerCapture} aria-label="Take photo"><span/></button><button className="flip-camera" onClick={() => setFacing(facing === "environment" ? "user" : "environment")} aria-label="Flip camera"><Icon name="rotate"/></button></div>{!reviewEnabled && <div className="direct-save-badge"><Icon name="check" size={15}/>Instant save is on</div>}
  </div>;
}

function PreviewScreen({ dataUrl, folder, onRetake, onSave }) {
  return <div className="preview-screen"><img src={dataUrl} alt="Captured preview"/><div className="preview-gradient"/><header><button className="glass-btn" onClick={onRetake}><Icon name="close"/></button><div><span>Review photo</span><small>Not saved yet</small></div><button className="glass-btn"><Icon name="dots"/></button></header><div className="preview-details"><span><Icon name="folder" size={17}/>Will save to <b>{folder?.name}</b></span></div><div className="preview-actions"><button className="secondary-action" onClick={onRetake}><Icon name="rotate"/>Retake</button><button className="save-action" onClick={onSave}><Icon name="check"/>Use photo</button></div></div>;
}

function FilesScreen({ folders, photos, selectedFolderId, onSelectFolder, onAddFolder, onFolderMenu, onPhotoMenu, onCamera, providerToken }) {
  const [query, setQuery] = useState(""); const [currentId, setCurrentId] = useState("root"); const current = folders.find(f => f.id === currentId) || folders[0];
  const children = folders.filter(f => f.parentId === currentId && f.name.toLowerCase().includes(query.toLowerCase())); const currentPhotos = photos.filter(p => p.folderId === currentId && p.name.toLowerCase().includes(query.toLowerCase()));
  const crumbs = []; let cursor = current; while (cursor) { crumbs.unshift(cursor); cursor = folders.find(f => f.id === cursor.parentId); }
  return <div className="app-screen files-screen"><header className="app-header"><div><span className="eyebrow">GOOGLE DRIVE</span><h1>My files</h1></div><div className="avatar">C</div></header><label className="searchbox"><Icon name="search" size={20}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search folders and photos"/></label><div className="breadcrumbs">{crumbs.map((c,i) => <span key={c.id}><button onClick={() => setCurrentId(c.id)}>{c.name}</button>{i < crumbs.length-1 && <Icon name="chevron" size={14}/>}</span>)}</div><div className="section-row"><h2>{current.name}</h2><button className="text-button" onClick={() => onAddFolder(currentId)}><Icon name="folderPlus" size={18}/>New folder</button></div><button className={`save-here ${selectedFolderId === currentId ? "active" : ""}`} onClick={() => onSelectFolder(currentId)}>{selectedFolderId === currentId ? <Icon name="check" size={17}/> : <Icon name="location" size={17}/>} {selectedFolderId === currentId ? "Current save location" : "Set as save location"}</button>
    <div className="file-content">{children.length > 0 && <div className="folder-grid">{children.map(f => <div className="folder-tile" key={f.id} role="button" tabIndex={0} onClick={() => setCurrentId(f.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCurrentId(f.id); }}><div className="folder-tile-top"><Icon name="folder" size={34}/><button className="mini-menu" aria-label={`Manage ${f.name}`} onClick={(e) => { e.stopPropagation(); onFolderMenu(f); }}><Icon name="dots" size={20}/></button></div><b>{f.name}</b><small>{folders.filter(x => x.parentId === f.id).length} folders · {photos.filter(x => x.folderId === f.id).length} photos</small>{selectedFolderId === f.id && <span className="saving-tag"><Icon name="location" size={12}/>Saving here</span>}</div>)}</div>}{currentPhotos.length > 0 && <><div className="section-row photo-heading"><h2>Photos</h2><span>{currentPhotos.length} items</span></div><div className="photo-grid">{currentPhotos.map(p => <button key={p.id} className="photo-tile" onClick={() => onPhotoMenu(p)}><DriveImage photo={p} providerToken={providerToken}/><span className="photo-dots"><Icon name="dots" size={18}/></span></button>)}</div></>}{children.length === 0 && currentPhotos.length === 0 && <div className="empty-state"><div><Icon name="folder" size={32}/></div><h3>This folder is ready</h3><p>Photos you capture here will appear in this space.</p><button className="outline-button" onClick={onCamera}><Icon name="camera" size={18}/>Open camera</button></div>}</div>
  </div>;
}

function SettingsScreen({ reviewEnabled, onReviewChange, folder, onChangeFolder, photoCount, onDisconnect, user }) {
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || "Google user";
  const email = user?.email || "Connected with Google";
  const initial = name.charAt(0).toUpperCase();
  return <div className="app-screen settings-screen"><header className="app-header"><div><span className="eyebrow">PREFERENCES</span><h1>Settings</h1></div><div className="avatar">{initial}</div></header><section className="profile-card"><div className="large-avatar">{initial}</div><div><b>{name}</b><span>{email}</span><small><DriveMark size={14}/>Google Drive connected</small></div><button className="icon-btn"><Icon name="chevron" size={20}/></button></section><h2 className="group-label">CAPTURE</h2><section className="settings-group"><div className="setting-row"><span className="setting-icon coral"><Icon name="image" size={21}/></span><div><b>Review after capture</b><p>Approve or retake before saving</p></div><Toggle checked={reviewEnabled} onChange={onReviewChange} label="Review after capture"/></div><button className="setting-row" onClick={onChangeFolder}><span className="setting-icon blue"><Icon name="folder" size={21}/></span><div><b>Save location</b><p>My Drive / {folder?.name}</p></div><Icon name="chevron" size={19}/></button></section><h2 className="group-label">STORAGE & PRIVACY</h2><section className="settings-group"><div className="setting-row"><span className="setting-icon green"><Icon name="shield" size={21}/></span><div><b>Drive access</b><p>Google OAuth edit access enabled</p></div><span className="connected-dot">Active</span></div><div className="setting-row"><span className="setting-icon sand"><Icon name="gallery" size={21}/></span><div><b>{photoCount} Drive photos</b><p>Visible in your accessible folders</p></div></div></section><section className="settings-group misc"><button className="setting-row"><Icon name="info" size={21}/><div><b>About DriveCam</b><p>Version 1.0</p></div><Icon name="chevron" size={19}/></button><button className="disconnect" onClick={onDisconnect}>Disconnect Google Drive</button></section></div>;
}

function BottomNav({ screen, onNavigate }) {
  return <nav className="bottom-nav"><button className={screen === "camera" ? "active" : ""} onClick={() => onNavigate("camera")}><span><Icon name="camera"/></span><small>Camera</small></button><button className={screen === "files" ? "active" : ""} onClick={() => onNavigate("files")}><span><Icon name="files"/></span><small>Files</small></button><button className={screen === "settings" ? "active" : ""} onClick={() => onNavigate("settings")}><span><Icon name="settings"/></span><small>Settings</small></button></nav>;
}

export default function Page() {
  const [screen, setScreen] = useState("login");
  const [folders, setFolders] = useState(starterFolders);
  const [selectedFolderId, setSelectedFolderId] = useState("root");
  const [photos, setPhotos] = useState([]);
  const [reviewEnabled, setReviewEnabled] = useState(true);
  const [pendingPhoto, setPendingPhoto] = useState(null);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const [authError, setAuthError] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [providerToken, setProviderToken] = useState("");
  const [user, setUser] = useState(null);
  const [driveBusy, setDriveBusy] = useState(false);

  const selectedFolder = folders.find((folder) => folder.id === selectedFolderId) || folders[0];
  const notify = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 2400);
  };

  const refreshDrive = async (token = providerToken) => {
    if (!token) return;
    const content = await listDriveContent(token);
    setFolders(content.folders);
    setPhotos(content.photos);
    setSelectedFolderId((currentId) => content.folders.some((folder) => folder.id === currentId) ? currentId : "root");
  };

  useEffect(() => {
    try {
      const preferences = JSON.parse(localStorage.getItem("drivecam-preferences"));
      if (preferences) {
        setSelectedFolderId(preferences.selectedFolderId || "root");
        setReviewEnabled(preferences.reviewEnabled ?? true);
      }
    } catch {}

    const acceptSession = async (session) => {
      setUser(session?.user || null);
      const token = session?.provider_token || sessionStorage.getItem("drivecam-google-token") || "";
      if (!session || !token) {
        setAuthChecking(false);
        return;
      }
      if (session.provider_token) sessionStorage.setItem("drivecam-google-token", session.provider_token);
      setProviderToken(token);
      try {
        await refreshDrive(token);
        setScreen((current) => current === "login" ? "setup" : current);
        setAuthError("");
      } catch (error) {
        setAuthError(error.message || "Could not open your Google Drive.");
      } finally {
        setAuthChecking(false);
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("drivecam-google-token");
        setProviderToken("");
        setUser(null);
        setFolders(starterFolders);
        setPhotos([]);
        setScreen("login");
        return;
      }
      void acceptSession(session);
    });
    void supabase.auth.getSession().then(({ data }) => acceptSession(data.session));
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    try { localStorage.setItem("drivecam-preferences", JSON.stringify({ selectedFolderId, reviewEnabled })); } catch {}
  }, [selectedFolderId, reviewEnabled]);

  const beginGoogleOAuth = async () => {
    setAuthError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes: "openid email profile https://www.googleapis.com/auth/drive",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    });
    if (error) {
      setAuthError(error.message);
      throw error;
    }
  };

  const runDriveAction = async (operation, successMessage) => {
    setDriveBusy(true);
    try {
      await operation();
      await refreshDrive();
      setModal(null);
      notify(successMessage);
    } catch (error) {
      setModal(null);
      notify(error.status === 401 ? "Drive access expired — reconnect Google" : error.message);
      if (error.status === 401) {
        sessionStorage.removeItem("drivecam-google-token");
        setProviderToken("");
        setAuthError("Your Google Drive permission expired. Please reconnect.");
        setScreen("login");
      }
    } finally {
      setDriveBusy(false);
    }
  };

  const savePhoto = async (dataUrl) => {
    const now = new Date();
    const name = `IMG_${now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}.jpg`;
    setDriveBusy(true);
    try {
      await uploadDrivePhoto(providerToken, dataUrl, name, selectedFolderId);
      setPendingPhoto(null);
      setScreen("camera");
      await refreshDrive();
      notify(`Saved to ${selectedFolder.name}`);
    } catch (error) {
      notify(error.message || "Could not save this photo to Drive.");
    } finally {
      setDriveBusy(false);
    }
  };

  const capture = (dataUrl) => {
    if (reviewEnabled) {
      setPendingPhoto(dataUrl);
      setScreen("preview");
    } else void savePhoto(dataUrl);
  };
  const createFolder = (name, parentId = "root") => runDriveAction(() => createDriveFolder(providerToken, name.trim(), parentId), "Folder created in Drive");
  const descendantIds = (id) => {
    const ids = [id];
    folders.filter((folder) => folder.parentId === id).forEach((folder) => ids.push(...descendantIds(folder.id)));
    return ids;
  };
  const deleteFolder = (id) => {
    if (descendantIds(id).includes(selectedFolderId)) setSelectedFolderId("root");
    return runDriveAction(() => trashDriveItem(providerToken, id), "Folder moved to Drive trash");
  };
  const moveFolder = (id, parentId) => {
    const folder = folders.find((item) => item.id === id);
    return runDriveAction(() => moveDriveItem(providerToken, id, folder?.parents, parentId), "Folder moved in Drive");
  };
  const renameFolder = (id, name) => runDriveAction(() => renameDriveItem(providerToken, id, name), "Folder renamed in Drive");
  const movePhoto = (id, folderId) => {
    const photo = photos.find((item) => item.id === id);
    return runDriveAction(() => moveDriveItem(providerToken, id, photo?.parents, folderId), "Photo moved in Drive");
  };
  const deletePhoto = (id) => runDriveAction(() => trashDriveItem(providerToken, id), "Photo moved to Drive trash");
  const disconnect = async () => {
    sessionStorage.removeItem("drivecam-google-token");
    await supabase.auth.signOut();
  };

  if (authChecking) {
    return <main className="site-shell"><div className="phone-shell auth-loading"><div className="brand-mark"><Icon name="camera" size={31}/></div><b>Opening DriveCam…</b></div></main>;
  }

  return <main className="site-shell"><div className="phone-shell">
    {screen === "login" && <LoginScreen onConnect={beginGoogleOAuth} error={authError}/>} 
    {screen === "setup" && <FolderSetup folders={folders} selectedId={selectedFolderId} onSelect={setSelectedFolderId} onContinue={() => setScreen("camera")} onAdd={() => setModal({ type: "new-folder", parentId: "root" })}/>} 
    {screen === "camera" && <CameraScreen folder={selectedFolder} reviewEnabled={reviewEnabled} onChangeFolder={() => setScreen("files")} onCapture={capture} lastPhoto={photos[0]} providerToken={providerToken}/>} 
    {screen === "preview" && <PreviewScreen dataUrl={pendingPhoto} folder={selectedFolder} onRetake={() => { setPendingPhoto(null); setScreen("camera"); }} onSave={() => void savePhoto(pendingPhoto)}/>} 
    {screen === "files" && <FilesScreen folders={folders} photos={photos} selectedFolderId={selectedFolderId} onSelectFolder={(id) => { setSelectedFolderId(id); notify("Save location updated"); }} onAddFolder={(parentId) => setModal({ type: "new-folder", parentId: parentId || "root" })} onFolderMenu={(folder) => setModal({ type: "folder-actions", folder })} onPhotoMenu={(photo) => setModal({ type: "photo-actions", photo })} onCamera={() => setScreen("camera")} providerToken={providerToken}/>} 
    {screen === "settings" && <SettingsScreen reviewEnabled={reviewEnabled} onReviewChange={(value) => { setReviewEnabled(value); notify(value ? "Photo review turned on" : "Photos will save instantly"); }} folder={selectedFolder} onChangeFolder={() => setScreen("files")} photoCount={photos.length} onDisconnect={disconnect} user={user}/>} 
    {["camera", "files", "settings"].includes(screen) && <BottomNav screen={screen} onNavigate={setScreen}/>} 
    {toast && <div className="toast"><Icon name="check" size={17}/>{toast}</div>}
    {driveBusy && <div className="drive-busy"><span/>Syncing with Google Drive…</div>}
    {modal?.type === "new-folder" && <NameModal title="Create new folder" confirmLabel="Create folder" onClose={() => setModal(null)} onConfirm={(name) => void createFolder(name, modal.parentId)}/>} 
    {modal?.type === "folder-actions" && <ActionModal item={modal.folder} onClose={() => setModal(null)} onRename={() => setModal({ type: "rename", folder: modal.folder })} onMove={() => setModal({ type: "move-folder", folder: modal.folder })} onDelete={() => void deleteFolder(modal.folder.id)}/>} 
    {modal?.type === "rename" && <NameModal title="Rename folder" initial={modal.folder.name} confirmLabel="Save name" onClose={() => setModal(null)} onConfirm={(name) => void renameFolder(modal.folder.id, name)}/>} 
    {modal?.type === "move-folder" && <MoveModal title={`Move “${modal.folder.name}”`} folders={folders.filter((folder) => folder.id !== modal.folder.id && !descendantIds(modal.folder.id).includes(folder.id))} onClose={() => setModal(null)} onMove={(id) => void moveFolder(modal.folder.id, id)}/>} 
    {modal?.type === "photo-actions" && <PhotoModal photo={modal.photo} folder={folders.find((folder) => folder.id === modal.photo.folderId)} onClose={() => setModal(null)} onMove={() => setModal({ type: "move-photo", photo: modal.photo })} onDelete={() => void deletePhoto(modal.photo.id)} providerToken={providerToken}/>} 
    {modal?.type === "move-photo" && <MoveModal title="Move photo" folders={folders} onClose={() => setModal(null)} onMove={(id) => void movePhoto(modal.photo.id, id)}/>} 
  </div></main>;
}

function NameModal({ title, initial = "", confirmLabel, onClose, onConfirm }) { const [name, setName] = useState(initial); return <Modal title={title} onClose={onClose}><label className="field-label">Folder name<input autoFocus value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === "Enter" && onConfirm(name)} placeholder="Untitled folder"/></label><div className="modal-buttons"><button className="plain-button" onClick={onClose}>Cancel</button><button className="primary-small" disabled={!name.trim()} onClick={() => onConfirm(name)}>{confirmLabel}</button></div></Modal>; }
function ActionModal({ item, onClose, onRename, onMove, onDelete }) { return <Modal title={item.name} onClose={onClose}><div className="action-list"><button onClick={onRename}><Icon name="edit"/><span><b>Rename</b><small>Give this folder a new name</small></span></button><button onClick={onMove}><Icon name="move"/><span><b>Move folder</b><small>Choose a new destination</small></span></button><button className="danger" onClick={onDelete}><Icon name="trash"/><span><b>Delete folder</b><small>Also deletes items inside</small></span></button></div></Modal>; }
function MoveModal({ title, folders, onClose, onMove }) { return <Modal title={title} onClose={onClose}><p className="sheet-help">Choose a destination in your Google Drive.</p><div className="destination-list">{folders.map(folder => <button key={folder.id} onClick={() => onMove(folder.id)}><span className="folder-icon"><Icon name="folder" size={21}/></span><b>{folder.name}</b><Icon name="chevron" size={18}/></button>)}</div></Modal>; }
function PhotoModal({ photo, folder, onClose, onMove, onDelete, providerToken }) { return <Modal title="Photo details" onClose={onClose}><div className="photo-action-preview"><DriveImage photo={photo} providerToken={providerToken}/><div><b>{photo.name}</b><small><Icon name="folder" size={14}/>{folder?.name}</small></div></div><div className="action-list"><button onClick={onMove}><Icon name="move"/><span><b>Move photo</b><small>Choose another Drive folder</small></span></button><button className="danger" onClick={onDelete}><Icon name="trash"/><span><b>Delete photo</b><small>Remove it from your Drive</small></span></button></div></Modal>; }
