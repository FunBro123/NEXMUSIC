import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { loadAudioFiles, saveAudioFiles } from "./libraryStorage";
import {
  AudioLines, Search, Home, Library, Heart, ListMusic, Plus, Play, Pause,
  SkipBack, SkipForward, Volume2, VolumeX, MoreHorizontal, Music2, Disc3,
  Clock3, Shuffle, Repeat, Upload, Headphones, PanelLeftClose, Menu, X,
  Sparkles, Eye, EyeOff, Send, ArrowLeft, Mail, LockKeyhole, Trash2, Pencil
} from "lucide-react";

type Track = { id: number; title: string; artist: string; album: string; duration: string; cover: string; src?: string };
type Playlist = { id: number; name: string; trackIds: number[] };

const demoTracks: Track[] = [
  { id: 1, title: "Midnight City", artist: "M83", album: "Hurry Up, We're Dreaming", duration: "4:03", cover: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&q=85" },
  { id: 2, title: "A Moment Apart", artist: "ODESZA", album: "A Moment Apart", duration: "3:54", cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=85" },
  { id: 3, title: "Intro", artist: "The xx", album: "xx", duration: "2:07", cover: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=500&q=85" },
  { id: 4, title: "Sunset Lover", artist: "Petit Biscuit", album: "Presence", duration: "3:57", cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=85" },
  { id: 5, title: "Nightcall", artist: "Kavinsky", album: "OutRun", duration: "4:18", cover: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=500&q=85" },
  { id: 6, title: "Weightless", artist: "Washed Out", album: "Within and Without", duration: "4:40", cover: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=500&q=85" }
];

const readSaved = <T,>(key: string, fallback: T): T => {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
};

export default function App() {
  const [session, setSession] = useState(() => localStorage.getItem("nexmusic.session.email") || "");
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authMethod, setAuthMethod] = useState<"email" | "telegram">("email");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [tracks, setTracks] = useState<Track[]>(demoTracks);
  const [current, setCurrent] = useState<Track>(demoTracks[0]);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState("Главная");
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<number[]>(() => readSaved<number[]>("nexmusic.favorites", []));
  const [playlists, setPlaylists] = useState<Playlist[]>(() => readSaved<Playlist[]>("nexmusic.playlists.v1", []));
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);
  const [volume, setVolume] = useState(72);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem("nexmusic.favorites", JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem("nexmusic.playlists.v1", JSON.stringify(playlists)); }, [playlists]);
  useEffect(() => {
    let cancelled = false;
    loadAudioFiles().then(saved => {
      if (!cancelled && saved.length) setTracks(old => [...saved, ...old.filter(track => !saved.some(item => item.id === track.id))]);
    }).catch(error => console.warn("NEXMUSIC library restore:", error));
    return () => { cancelled = true; };
  }, []);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume / 100; }, [volume]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (current.src) {
      audio.src = current.src;
      if (playing) void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  }, [current]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !current.src) return;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing]);

  const visibleTracks = useMemo(() => {
    let list = tracks;
    if (active === "Избранное") list = list.filter(t => favorites.includes(t.id));
    if (query.trim()) list = list.filter(t => (t.title + t.artist + t.album).toLowerCase().includes(query.toLowerCase()));
    return list;
  }, [tracks, active, favorites, query]);

  const toggleFavorite = (id: number) => setFavorites(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]);
  const createPlaylist = () => {
    const name = window.prompt("Название нового плейлиста:");
    if (!name?.trim()) return;
    const playlist: Playlist = { id: Date.now(), name: name.trim().slice(0, 40), trackIds: [] };
    setPlaylists(old => [...old, playlist]);
    setSelectedPlaylistId(playlist.id);
  };
  const renamePlaylist = (playlist: Playlist) => {
    const name = window.prompt("Новое название плейлиста:", playlist.name);
    if (!name?.trim()) return;
    setPlaylists(old => old.map(item => item.id === playlist.id ? { ...item, name: name.trim().slice(0, 40) } : item));
  };
  const deletePlaylist = (playlist: Playlist) => {
    if (!window.confirm("Удалить плейлист «" + playlist.name + "»? Сами аудиофайлы останутся в медиатеке.")) return;
    setPlaylists(old => old.filter(item => item.id !== playlist.id));
    if (selectedPlaylistId === playlist.id) setSelectedPlaylistId(null);
  };
  const togglePlaylistTrack = (playlistId: number, trackId: number) => {
    setPlaylists(old => old.map(item => item.id !== playlistId ? item : {
      ...item, trackIds: item.trackIds.includes(trackId) ? item.trackIds.filter(id => id !== trackId) : [...item.trackIds, trackId]
    }));
  };
  const playTrack = (track: Track) => { setCurrent(track); setPlaying(Boolean(track.src)); };
  const nextTrack = () => {
    const index = tracks.findIndex(t => t.id === current.id);
    const next = shuffle ? tracks[Math.floor(Math.random() * tracks.length)] : tracks[(index + 1) % tracks.length];
    if (next) playTrack(next);
  };
  const previousTrack = () => {
    const index = tracks.findIndex(t => t.id === current.id);
    playTrack(tracks[(index - 1 + tracks.length) % tracks.length]);
  };
  const importFiles = async (files?: FileList | null) => {
    if (!files) return;
    const audioFiles = Array.from(files).filter(file => file.type.startsWith("audio/"));
    if (!audioFiles.length) return;
    try {
      const saved = await saveAudioFiles(audioFiles);
      const added: Track[] = saved.map(({ file, ...track }) => ({ ...track, src: URL.createObjectURL(file) }));
      setTracks(old => [...added, ...old]);
      if (added[0]) { setCurrent(added[0]); setPlaying(true); setActive("Медиатека"); }
    } catch (error) {
      console.error("NEXMUSIC import failed:", error);
      window.alert("Не удалось сохранить музыку на устройстве. Проверь свободное место и разрешения браузера.");
    }
  };
  const nav = [{ label: "Главная", icon: Home }, { label: "Поиск", icon: Search }, { label: "Медиатека", icon: Library }, { label: "Избранное", icon: Heart }, { label: "Плейлисты", icon: ListMusic }];
  const formatTime = (n: number) => !Number.isFinite(n) ? "0:00" : Math.floor(n / 60) + ":" + String(Math.floor(n % 60)).padStart(2, "0");
  const submitAuth = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthMessage("");
    if (authMode === "forgot") {
      setAuthMessage("Восстановление пароля станет доступно после подключения сервера авторизации.");
      return;
    }
    if (authPassword.length < 6) {
      setAuthMessage("Пароль должен содержать не менее 6 символов.");
      return;
    }
    // Temporary local demo session only. Password is never stored.
    localStorage.setItem("nexmusic.session.email", authEmail.trim());
    setSession(authEmail.trim());
  };

  if (!session) return <main className="auth-screen">
    <div className="auth-orb auth-orb-one"/><div className="auth-orb auth-orb-two"/>
    <section className="auth-card">
      <div className="auth-brand">
        <div className="auth-star"><Sparkles size={27} strokeWidth={1.7}/></div>
        <h1>NEXMUSIC</h1>
        <p>Твоя музыка ближе</p>
      </div>
      <div className="auth-tabs">
        <button className={authMethod === "email" ? "active" : ""} onClick={() => { setAuthMethod("email"); setAuthMessage(""); }}>Email</button>
        <button className={authMethod === "telegram" ? "active" : ""} onClick={() => { setAuthMethod("telegram"); setAuthMessage(""); }}><Send size={14}/> Telegram</button>
      </div>
      {authMethod === "email" ? <>
        <form className="auth-form" onSubmit={submitAuth}>
          {authMode !== "forgot" && <label className="auth-field"><span>Email</span><div><Mail size={17}/><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></div></label>}
          {authMode === "forgot" && <label className="auth-field"><span>Email</span><div><Mail size={17}/><input type="email" value={authEmail} onChange={e => setAuthEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email"/></div></label>}
          {authMode !== "forgot" && <label className="auth-field"><span>Пароль</span><div><LockKeyhole size={17}/><input type={showPassword ? "text" : "password"} value={authPassword} onChange={e => setAuthPassword(e.target.value)} placeholder="Не менее 6 символов" minLength={6} required autoComplete={authMode === "register" ? "new-password" : "current-password"}/><button type="button" className="password-toggle" aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></label>}
          <button className="auth-submit" type="submit">{authMode === "register" ? "Зарегистрироваться" : authMode === "forgot" ? "Восстановить пароль" : "Войти"}</button>
        </form>
        {authMessage && <p className="auth-message">{authMessage}</p>}
        {authMode === "login" && <button className="auth-link forgot-link" onClick={() => { setAuthMode("forgot"); setAuthMessage(""); }}>Забыли пароль?</button>}
        <div className="auth-bottom">{authMode === "register" ? <>Уже есть аккаунт? <button onClick={() => setAuthMode("login")}>Войти</button></> : authMode === "forgot" ? <button onClick={() => { setAuthMode("login"); setAuthMessage(""); }}><ArrowLeft size={14}/> Назад ко входу</button> : <>Нет аккаунта? <button onClick={() => { setAuthMode("register"); setAuthMessage(""); }}>Зарегистрироваться</button></>}</div>
        <p className="auth-demo-note">Локальный демо-вход. Проверка аккаунта через сервер пока не подключена.</p>
      </> : <div className="telegram-panel"><div className="telegram-icon"><Send size={24}/></div><strong>Вход через Telegram</strong><p>Подключение Telegram-авторизации появится после настройки бота и сервера.</p><button onClick={() => setAuthMethod("email")}>Вернуться к Email</button></div>}
    </section>
    <span className="auth-copyright">© 2026 NEXMUSIC · Музыка без границ</span>
  </main>;

  return <div className="app-shell">
    <audio ref={audioRef} onTimeUpdate={e => setProgress(e.currentTarget.currentTime)} onLoadedMetadata={e => setDuration(e.currentTarget.duration)} onEnded={() => repeat ? (audioRef.current && (audioRef.current.currentTime = 0, void audioRef.current.play())) : nextTrack()} />
    <aside className={mobileMenu ? "sidebar open" : "sidebar"}>
      <div className="brand"><div className="brand-mark"><AudioLines size={22}/></div><span>NEX<span className="brand-accent">MUSIC</span></span><button className="mobile-close icon-btn" onClick={() => setMobileMenu(false)}><X/></button></div>
      <div className="nav-label">МЕНЮ</div>
      <nav>{nav.map(item => <button key={item.label} className={active === item.label ? "nav-item selected" : "nav-item"} onClick={() => { setActive(item.label); setMobileMenu(false); }}><item.icon size={18}/><span>{item.label}</span>{item.label === "Избранное" && favorites.length > 0 && <small>{favorites.length}</small>}</button>)}</nav>
      <div className="sidebar-divider"/>
      <div className="nav-label">ТВОЯ КОЛЛЕКЦИЯ</div>
      <button className="nav-item" onClick={() => fileRef.current?.click()}><Plus size={18}/><span>Добавить музыку</span></button>
      <button className="nav-item" onClick={() => setActive("Плейлисты")}><ListMusic size={18}/><span>Мои плейлисты</span></button>
      <div className="sidebar-bottom"><div className="storage-card"><div className="storage-icon"><Headphones size={18}/></div><div><strong>Твоя музыка</strong><span>Всегда рядом</span></div></div><div className="free-note"><span className="free-dot"/> Бесплатно. Без подписки.</div></div>
    </aside>
    {mobileMenu && <button className="scrim" aria-label="Закрыть меню" onClick={() => setMobileMenu(false)}/>}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu icon-btn" onClick={() => setMobileMenu(true)}><Menu/></button><div className="breadcrumbs">NEXMUSIC <span>/</span> {active}</div><div className="top-actions"><div className="search-box"><Search size={17}/><input value={query} onChange={e => { setQuery(e.target.value); if (e.target.value) setActive("Поиск"); }} placeholder="Треки, исполнители, альбомы..."/><kbd>⌘ K</kbd></div><button className="avatar" title={"Выйти (" + session + ")"} onClick={() => { localStorage.removeItem("nexmusic.session.email"); setSession(""); setAuthMode("login"); setAuthPassword(""); }}>N</button></div></header>
      <div className="content">
        {active === "Главная" && <>
          <section className="hero glass"><div className="hero-glow"/><div className="hero-copy"><div className="eyebrow"><span className="pulse"/> ТВОЁ МУЗЫКАЛЬНОЕ ПРОСТРАНСТВО</div><h1>Звук, который<br/><span>твой.</span></h1><p>Открой любимые треки. Создавай настроение. Слушай по-своему.</p><button className="primary-btn" onClick={() => { const local = tracks.find(t => t.src); if (local) playTrack(local); else setActive("Медиатека"); }}><Play size={17} fill="currentColor"/> Открыть медиатеку</button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="hero-disc"><div className="disc-center"><AudioLines size={36}/></div></div><div className="floating-chip chip-one"><AudioLines size={15}/> PURE SOUND</div><div className="floating-chip chip-two"><span className="equalizer"><i/><i/><i/><i/></span> NOW PLAYING</div></div></section>
          <section className="section"><div className="section-heading"><div><div className="eyebrow muted">ТВОЯ КОЛЛЕКЦИЯ</div><h2>Быстрый доступ</h2></div><button className="text-btn" onClick={() => setActive("Медиатека")}>Вся медиатека <span>→</span></button></div><div className="quick-grid"><button className="quick-card quick-fav" onClick={() => setActive("Избранное")}><div className="quick-icon"><Heart fill="currentColor"/></div><div><strong>Избранное</strong><span>{favorites.length} треков</span></div><Play size={17}/></button><button className="quick-card quick-library" onClick={() => setActive("Медиатека")}><div className="quick-icon"><Disc3/></div><div><strong>Моя музыка</strong><span>{tracks.length} треков</span></div><Play size={17}/></button><button className="quick-card quick-playlist" onClick={() => fileRef.current?.click()}><div className="quick-icon"><Plus/></div><div><strong>Добавить треки</strong><span>С устройства</span></div><Upload size={17}/></button></div></section>
        </>}
        {(active === "Медиатека" || active === "Избранное" || active === "Поиск") && <section className="section library-section"><div className="section-heading"><div><div className="eyebrow muted">{active === "Избранное" ? "СОХРАНЁННОЕ" : "ТВОЯ МУЗЫКА"}</div><h2>{active === "Поиск" ? "Результаты поиска" : active}</h2><p className="section-sub">{visibleTracks.length} треков в коллекции</p></div><button className="primary-btn compact" onClick={() => fileRef.current?.click()}><Upload size={16}/> Добавить музыку</button></div>
          {visibleTracks.length ? <div className="track-table"><div className="track-head"><span>#</span><span>НАЗВАНИЕ</span><span>АЛЬБОМ</span><span><Clock3 size={14}/></span><span/></div>{visibleTracks.map((track, i) => <div className={current.id === track.id ? "track-row active-track" : "track-row"} key={track.id} onDoubleClick={() => playTrack(track)}><span className="track-number">{current.id === track.id && playing ? <AudioLines size={16}/> : String(i + 1).padStart(2, "0")}</span><button className="track-info" onClick={() => playTrack(track)}><img src={track.cover} alt=""/><span><strong>{track.title}</strong><small>{track.artist}</small></span></button><span className="track-album">{track.album}</span><span className="track-duration">{track.duration}</span><button className={favorites.includes(track.id) ? "heart-btn liked" : "heart-btn"} onClick={() => toggleFavorite(track.id)} aria-label="В избранное"><Heart size={17} fill={favorites.includes(track.id) ? "currentColor" : "none"}/></button></div>)}</div> : <div className="empty-state"><Music2 size={34}/><strong>Здесь пока тихо</strong><span>Добавь аудиофайлы со своего устройства.</span><button className="primary-btn compact" onClick={() => fileRef.current?.click()}><Plus size={16}/> Добавить музыку</button></div>}
        </section>}
        {active === "Плейлисты" && <section className="section playlist-section">
          <div className="section-heading"><div><div className="eyebrow muted">ТВОЯ КОЛЛЕКЦИЯ</div><h2>Плейлисты</h2><p className="section-sub">{playlists.length} плейлистов · сохраняются на этом устройстве</p></div><button className="primary-btn compact" onClick={createPlaylist}><Plus size={16}/> Создать плейлист</button></div>
          {!playlists.length ? <div className="empty-state"><ListMusic size={34}/><strong>Плейлистов пока нет</strong><span>Создай первый плейлист и собери в нём любимые треки.</span><button className="primary-btn compact" onClick={createPlaylist}><Plus size={16}/> Создать плейлист</button></div> : <>
            <div className="playlist-grid">{playlists.map(playlist => <article className={selectedPlaylistId === playlist.id ? "playlist-card selected-playlist" : "playlist-card"} key={playlist.id}>
              <button className="playlist-open" onClick={() => setSelectedPlaylistId(playlist.id)}><div className="playlist-art"><ListMusic size={30}/></div><strong>{playlist.name}</strong><span>{playlist.trackIds.length} треков</span></button>
              <div className="playlist-actions"><button className="control-btn" aria-label="Переименовать" onClick={() => renamePlaylist(playlist)}><Pencil size={15}/></button><button className="control-btn danger-control" aria-label="Удалить" onClick={() => deletePlaylist(playlist)}><Trash2 size={15}/></button></div>
            </article>)}</div>
            {playlists.filter(item => item.id === selectedPlaylistId).map(playlist => {
              const playlistTracks = playlist.trackIds.map(id => tracks.find(track => track.id === id)).filter((track): track is Track => Boolean(track));
              return <div className="playlist-detail" key={playlist.id}>
                <div className="playlist-detail-heading"><div><div className="eyebrow muted">ВЫБРАННЫЙ ПЛЕЙЛИСТ</div><h3>{playlist.name}</h3><p className="section-sub">{playlistTracks.length} треков</p></div><button className="text-btn" onClick={() => setSelectedPlaylistId(null)}>Закрыть</button></div>
                <div className="playlist-track-list">{tracks.map(track => {
                  const included = playlist.trackIds.includes(track.id);
                  return <div className="playlist-track" key={track.id}><img src={track.cover} alt=""/><div><strong>{track.title}</strong><span>{track.artist}</span></div><button className={included ? "playlist-toggle included" : "playlist-toggle"} onClick={() => togglePlaylistTrack(playlist.id, track.id)}>{included ? "Добавлено" : "＋ Добавить"}</button>{included && <button className="control-btn danger-control" aria-label="Убрать из плейлиста" onClick={() => togglePlaylistTrack(playlist.id, track.id)}><Trash2 size={15}/></button>}</div>;
                })}</div>
              </div>;
            })}
          </>}
        </section>}
        <input ref={fileRef} type="file" accept="audio/*" multiple hidden onChange={e => { void importFiles(e.target.files); e.currentTarget.value = ""; }}/>
        {active === "Главная" && <section className="section"><div className="section-heading"><div><div className="eyebrow muted">НАЧНИ С ЭТОГО</div><h2>Недавно добавленное</h2></div><button className="text-btn" onClick={() => setActive("Медиатека")}>Все треки →</button></div><div className="album-grid">{tracks.slice(0, 4).map(t => <button className="album-card" key={t.id} onClick={() => playTrack(t)}><div className="album-cover"><img src={t.cover} alt=""/><span className="album-play"><Play fill="currentColor" size={20}/></span></div><strong>{t.title}</strong><span>{t.artist}</span></button>)}</div></section>}
        <footer>© 2026 NEXMUSIC <span>Сделано для музыки.</span><span className="footer-free">100% FREE</span></footer>
      </div>
    </main>
    <section className="player-bar"><div className="now-playing"><img src={current.cover} alt=""/><div><strong>{current.title}</strong><span>{current.artist}</span></div><button className={favorites.includes(current.id) ? "heart-btn liked" : "heart-btn"} onClick={() => toggleFavorite(current.id)}><Heart size={17} fill={favorites.includes(current.id) ? "currentColor" : "none"}/></button></div><div className="player-center"><div className="player-controls"><button className={shuffle ? "control-btn toggled" : "control-btn"} onClick={() => setShuffle(!shuffle)}><Shuffle size={16}/></button><button className="control-btn" onClick={previousTrack}><SkipBack size={19} fill="currentColor"/></button><button className="play-main" onClick={() => current.src ? setPlaying(!playing) : fileRef.current?.click()}>{playing ? <Pause size={20} fill="currentColor"/> : <Play size={20} fill="currentColor"/>}</button><button className="control-btn" onClick={nextTrack}><SkipForward size={19} fill="currentColor"/></button><button className={repeat ? "control-btn toggled" : "control-btn"} onClick={() => setRepeat(!repeat)}><Repeat size={16}/></button></div><div className="timeline"><span>{formatTime(progress)}</span><input aria-label="Позиция воспроизведения" type="range" min="0" max={duration || 100} value={Math.min(progress, duration || 100)} onChange={e => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}/><span>{duration ? formatTime(duration) : current.duration}</span></div></div><div className="player-extra"><button className="control-btn" onClick={() => fileRef.current?.click()}><ListMusic size={17}/></button><Volume2 size={17}/><input aria-label="Громкость" className="volume-range" type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))}/><span className="quality">LOCAL</span></div></section>
  </div>;
}