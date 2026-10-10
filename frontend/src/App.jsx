
import { useEffect, useRef, useState } from "react";
import {
  Activity, ArrowRight, Brain, Check, ChevronDown, CircleHelp, Eye,
  Focus, ImagePlus, LoaderCircle, Mic, MicOff, RotateCcw, Send,
  ShieldCheck, Sparkles, Volume2, VolumeX, X
} from "lucide-react";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, "");

const modes = [
  {
    id: "scene",
    label: "Scene support",
    title: "Help me understand what's happening",
    description: "Get a clear, calm explanation of a situation or photo.",
    icon: Eye,
    color: "lavender",
    prompt: "Explain what may be happening here and suggest one next step."
  },
  {
    id: "focus",
    label: "Focus support",
    title: "Help me find my next step",
    description: "Turn an overwhelming task into one small, doable action.",
    icon: Focus,
    color: "peach",
    prompt: "I'm feeling overwhelmed. Break this down and tell me the one thing to do first."
  },
  {
    id: "memory",
    label: "Memory support",
    title: "Help me keep track",
    description: "Organize details you share into a useful reminder.",
    icon: Brain,
    color: "mint",
    prompt: "Organize the details I give you into a short reminder and checklist."
  }
];

function App() {
  const [mode, setMode] = useState("scene");
  const [text, setText] = useState("");
  const [context, setContext] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [answer, setAnswer] = useState("");
  const [answerMode, setAnswerMode] = useState("scene");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const fileRef = useRef(null);
  const recognitionRef = useRef(null);

  const selectedMode = modes.find((item) => item.id === mode) || modes[0];

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/api/health`)
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setApiStatus(data.configured ? "ready" : "key-needed");
      })
      .catch(() => {
        if (!cancelled) setApiStatus("offline");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Please choose an image smaller than 8 MB.");
      event.target.value = "";
      return;
    }
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError("");
  }

  function removeImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImage(null);
    setImagePreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError("Speech input isn't supported in this browser. Try Chrome or Edge, or type instead.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join("");
      setText(transcript);
    };
    recognition.onerror = () => {
      setError("I couldn't capture that. Please try again or type your message.");
      setListening(false);
    };
    recognition.onend = () => setListening(false);
    setError("");
    setListening(true);
    recognition.start();
  }

  async function getGuidance(event) {
    event?.preventDefault();
    if (!text.trim() && !context.trim() && !image) {
      setError("Type a little about what you need, add context, or attach a photo first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      let imageBase64 = "";
      if (image) {
        imageBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
          reader.onerror = () => reject(new Error("Couldn't read that image. Please choose it again."));
          reader.readAsDataURL(image);
        });
      }
      const response = await fetch(`${API_BASE}/api/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text: text.trim(),
          context: context.trim(),
          imageBase64,
          mimeType: image?.type || ""
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
      setAnswer(data.answer);
      setAnswerMode(mode);
      setApiStatus("ready");
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function readAloud() {
    if (!("speechSynthesis" in window)) {
      setError("Read aloud isn't supported in this browser.");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.rate = 0.92;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function reset() {
    setText("");
    setContext("");
    removeImage();
    setAnswer("");
    setError("");
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="AccessLens home">
          <span className="brand-mark"><Eye size={21} strokeWidth={2.3} /></span>
          <span>access<span className="brand-light">lens</span></span>
        </a>
        <div className="topbar-right">
          <span className={`status-dot ${apiStatus === "ready" ? "online" : apiStatus === "checking" ? "checking" : "offline"}`} />
          <span className="status-text">
            {apiStatus === "ready" ? "AI connected" : apiStatus === "checking" ? "Checking AI…" : apiStatus === "key-needed" ? "API key needed" : "Backend offline"}
          </span>
          <span className="top-divider" />
          <span className="privacy-label"><ShieldCheck size={15} /> Your choice, your pace</span>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="eyebrow"><span className="sparkle-dot"><Sparkles size={13} /></span> YOUR PERSONAL ACCESSIBILITY COMPANION</div>
          <h1>A little more clarity.<br /><span>A little less overwhelm.</span></h1>
          <p className="hero-copy">Life can be a lot to process. AccessLens helps you make sense of a moment, find your next step, or keep important details in one calm place.</p>
          <div className="hero-pills">
            <span><Check size={14} /> Clear, simple language</span>
            <span><Check size={14} /> One step at a time</span>
            <span><Check size={14} /> You stay in control</span>
          </div>
        </section>

        <section className="workspace">
          <div className="mode-heading">
            <div>
              <span className="section-kicker">CHOOSE YOUR SUPPORT</span>
              <h2>What would help right now?</h2>
            </div>
            <span className="step-count">01 <span>/ 02</span></span>
          </div>
          <div className="mode-grid">
            {modes.map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button key={item.id} type="button" className={`mode-card ${item.color} ${active ? "active" : ""}`} onClick={() => setMode(item.id)} aria-pressed={active}>
                  <span className="mode-icon"><Icon size={22} /></span>
                  <span className="mode-name">{item.label}</span>
                  <span className="mode-description">{item.description}</span>
                  <span className={`radio-indicator ${active ? "selected" : ""}`}>{active && <Check size={13} />}</span>
                </button>
              );
            })}
          </div>

          <div className="work-grid">
            <section className="input-panel">
              <div className="panel-topline">
                <div className="panel-title">
                  <span className={`small-mode-icon ${selectedMode.color}`}><selectedMode.icon size={17} /></span>
                  <div>
                    <h3>{selectedMode.title}</h3>
                    <p>Share as much or as little as you like.</p>
                  </div>
                </div>
                <span className="step-count">02 <span>/ 02</span></span>
              </div>

              <form onSubmit={getGuidance}>
                <label htmlFor="user-prompt" className="field-label">What's on your mind?</label>
                <div className="prompt-wrap">
                  <textarea
                    id="user-prompt"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder={mode === "scene" ? "Tell me what you're seeing or experiencing…" : mode === "focus" ? "What's the task or situation that feels like too much?" : "What do you want to remember or organize?"}
                    rows={4}
                  />
                  <div className="textarea-tools">
                    <span className="soft-hint">A few words are enough.</span>
                    <button type="button" className={`icon-button ${listening ? "listening" : ""}`} onClick={startListening} title={listening ? "Stop listening" : "Use voice input"} aria-label={listening ? "Stop listening" : "Use voice input"}>
                      {listening ? <MicOff size={17} /> : <Mic size={17} />}
                    </button>
                  </div>
                </div>

                <button type="button" className="context-toggle" onClick={() => setContextOpen(!contextOpen)} aria-expanded={contextOpen}>
                  <span>+ Add helpful context <span className="optional">(optional)</span></span>
                  <ChevronDown size={16} className={contextOpen ? "rotate" : ""} />
                </button>
                {contextOpen && (
                  <div className="context-field">
                    <label htmlFor="context" className="field-label">Anything else that would help?</label>
                    <textarea id="context" value={context} onChange={(e) => setContext(e.target.value)} rows={3} placeholder="For example: preferences, deadlines, what you've already tried…" />
                  </div>
                )}

                <div className="upload-area">
                  <input ref={fileRef} id="image-upload" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} hidden />
                  {!image ? (
                    <button type="button" className="upload-button" onClick={() => fileRef.current?.click()}>
                      <span className="upload-icon"><ImagePlus size={19} /></span>
                      <span><strong>Add a photo</strong><small>{mode === "scene" ? "Let AccessLens help describe a scene" : "Optional visual context"} · JPG, PNG, WebP</small></span>
                      <span className="upload-browse">Browse</span>
                    </button>
                  ) : (
                    <div className="image-preview-row">
                      <img src={imagePreview} alt="Selected upload preview" />
                      <div className="image-file-info"><strong>{image.name}</strong><small>{(image.size / 1024 / 1024).toFixed(2)} MB · ready to analyze</small></div>
                      <button type="button" className="icon-button remove-image" onClick={removeImage} aria-label="Remove image"><X size={17} /></button>
                    </div>
                  )}
                </div>

                {error && <div className="error-message" role="alert"><CircleHelp size={17} /><span>{error}</span></div>}

                <button type="submit" className="submit-button" disabled={loading}>
                  {loading ? <><LoaderCircle className="spin" size={18} /> Finding clarity…</> : <><Sparkles size={17} /> Get guidance <ArrowRight size={17} /></>}
                </button>
                <div className="form-footnote"><ShieldCheck size={14} /> Your photo and prompt are sent to Gemini to generate a response.</div>
              </form>
            </section>

            <section className={`answer-panel ${answer ? "has-answer" : ""}`} aria-live="polite">
              {!answer && !loading ? (
                <div className="empty-state">
                  <div className="empty-illustration">
                    <div className="orbit orbit-one" /><div className="orbit orbit-two" />
                    <div className="illustration-core"><Sparkles size={30} /></div>
                    <span className="float-star star-one">✦</span><span className="float-star star-two">✧</span>
                  </div>
                  <span className="section-kicker">YOUR SPACE TO PAUSE</span>
                  <h3>Let's take it<br />one step at a time.</h3>
                  <p>Your guidance will appear here, in clear and friendly language. No rush.</p>
                  <div className="empty-tip"><span className="tip-icon"><Activity size={17} /></span><span><strong>Little tip</strong><br />You don't need to explain everything perfectly to get started.</span></div>
                </div>
              ) : loading ? (
                <div className="loading-state">
                  <div className="loading-orb"><Sparkles size={26} /></div>
                  <h3>Putting the pieces together…</h3>
                  <p>Taking a moment to make your next step clearer.</p>
                  <div className="loading-bars"><span /><span /><span /></div>
                </div>
              ) : (
                <div className="answer-content">
                  <div className="answer-header">
                    <span className="answer-check"><Check size={16} /></span>
                    <div><span className="section-kicker">A LITTLE CLARITY</span><h3>Here's what may help</h3></div>
                  </div>
                  <div className="answer-text">{answer}</div>
                  <div className="answer-actions">
                    <button type="button" className="secondary-button" onClick={readAloud}>{speaking ? <VolumeX size={16} /> : <Volume2 size={16} />}{speaking ? "Stop reading" : "Read aloud"}</button>
                    <button type="button" className="secondary-button" onClick={() => { setText(""); setContext(""); setAnswer(""); setError(""); }}>{<RotateCcw size={15} />} Start fresh</button>
                  </div>
                  <div className="gentle-reminder"><ShieldCheck size={15} /><span>Use your own judgment, too. AI can get things wrong.</span></div>
                </div>
              )}
            </section>
          </div>
        </section>

        <section className="how-section">
          <div className="how-heading"><span className="section-kicker">MADE FOR REAL-LIFE MOMENTS</span><h2>Support that meets you where you are.</h2></div>
          <div className="how-grid">
            <div className="how-card"><span className="how-number">01</span><Eye size={20} /><h3>Understand a moment</h3><p>Make a busy scene or confusing situation easier to process.</p></div>
            <div className="how-card"><span className="how-number">02</span><Focus size={20} /><h3>Find your first step</h3><p>Turn a big, tangled task into one small action you can take now.</p></div>
            <div className="how-card"><span className="how-number">03</span><Brain size={20} /><h3>Keep details together</h3><p>Shape the notes you provide into a helpful reminder.</p></div>
          </div>
        </section>

        <footer className="footer">
          <a className="brand footer-brand" href="#"><span className="brand-mark"><Eye size={18} /></span><span>access<span className="brand-light">lens</span></span></a>
          <span>More clarity, on your terms.</span>
          <span className="footer-note">Prototype · Not a diagnostic or emergency service</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
