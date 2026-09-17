'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false });

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // মোড নির্বাচন: 'image' অথবা 'text'
  const [mode, setMode] = useState<'text' | 'image'>('image');
  const [prompt, setPrompt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFormat, setImageFormat] = useState('png');

  const [loading, setLoading] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loggedIn = localStorage.getItem('arpis_auth');
    if (loggedIn === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'arpis123') {
      setIsAuthenticated(true);
      localStorage.setItem('arpis_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('ভুল আইডি অথবা পাসওয়ার্ড! আবার চেষ্টা করুন।');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('arpis_auth');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      setImageFormat(ext === 'jpg' ? 'jpeg' : ext);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (mode === 'text' && !prompt.trim()) return;
    if (mode === 'image' && !selectedImage) return;

    setLoading(true);
    setStatus('Submitting asset to Tripo AI...');
    setModelUrl(null);

    try {
      const payload = mode === 'image' 
        ? { imageBase64: selectedImage, imageFormat }
        : { prompt };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.taskId) {
        throw new Error(data.error || 'Failed to start task');
      }

      const taskId = data.taskId;
      let completed = false;

      while (!completed) {
        await new Promise((r) => setTimeout(r, 2500));
        const statusRes = await fetch(`/api/generate?taskId=${taskId}`);
        const statusData = await statusRes.json();

        const taskInfo = statusData.data;
        if (!taskInfo) continue;

        if (taskInfo.status === 'running' || taskInfo.status === 'queued') {
          setStatus(`Generating 3D model: ${taskInfo.progress || 0}% complete...`);
        } else if (taskInfo.status === 'success') {
          completed = true;
          const url = taskInfo.output?.model || taskInfo.output?.pbr_model || taskInfo.output?.base_model;
          setModelUrl(url);
          setStatus('Model generated successfully!');
        } else if (taskInfo.status === 'failed') {
          throw new Error('Tripo AI generation failed');
        }
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!modelUrl) return;
    try {
      const downloadUrl = `/api/generate?fileUrl=${encodeURIComponent(modelUrl)}`;
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `arpis-3d-model-${Date.now()}.glb`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      alert('Failed to download model file');
    }
  };

  const handleFullScreen = () => {
    if (!viewerRef.current) return;
    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch((err) => alert(err.message));
    } else {
      document.exitFullscreen();
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-neutral-900/80 border border-neutral-800 p-8 rounded-2xl shadow-2xl backdrop-blur">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
              ARPIS 3D Studio
            </h1>
            <p className="text-neutral-400 text-xs mt-1">লগইন করে ড্যাশবোর্ডে প্রবেশ করুন</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">User ID</label>
              <input
                type="text"
                placeholder="Enter User ID (admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full bg-[#141417] border border-neutral-700/80 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">Password</label>
              <input
                type="password"
                placeholder="Enter Password (arpis123)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-[#141417] border border-neutral-700/80 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {loginError && <p className="text-red-400 text-xs text-center">{loginError}</p>}

            <button
              type="submit"
              className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold py-3 px-6 rounded-xl transition duration-200 cursor-pointer"
            >
              Login to Studio
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0a0a0c] text-white flex flex-col items-center justify-center p-6 relative">
      <button
        onClick={handleLogout}
        className="absolute top-6 right-8 bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 px-3.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer"
      >
        Logout
      </button>

      <div className="w-full max-w-4xl flex flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
            ARPIS 3D Studio
          </h1>
          <p className="text-neutral-400 text-sm mt-2">
            AI-Powered Generative 3D Modeling Platform
          </p>
        </div>

        {/* ৩ডি ভিউয়ার */}
        <div
          ref={viewerRef}
          className="w-full h-[450px] bg-neutral-900/70 rounded-2xl border border-neutral-800 flex items-center justify-center overflow-hidden shadow-2xl relative"
        >
          {modelUrl ? (
            <>
              <ModelViewer url={modelUrl} />
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                <button
                  onClick={handleDownload}
                  title="Download GLB file"
                  className="bg-neutral-800/90 hover:bg-neutral-700 text-amber-400 border border-neutral-700 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition backdrop-blur cursor-pointer"
                >
                  Download .GLB
                </button>
                <button
                  onClick={handleFullScreen}
                  title="Toggle Fullscreen"
                  className="bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 p-1.5 rounded-lg text-xs transition backdrop-blur cursor-pointer"
                >
                  ⛶
                </button>
              </div>
            </>
          ) : (
            <div className="text-neutral-500 text-sm text-center px-4">
              {loading ? status : 'Your 3D model will appear here'}
            </div>
          )}
        </div>

        {/* ইনপুট মোড সুইচ */}
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <div className="flex bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
            <button
              onClick={() => setMode('image')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                mode === 'image' ? 'bg-amber-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Image to 3D (ছবি থেকে)
            </button>
            <button
              onClick={() => setMode('text')}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition cursor-pointer ${
                mode === 'text' ? 'bg-amber-500 text-black font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Text to 3D (লেখা থেকে)
            </button>
          </div>

          {mode === 'image' ? (
            <div className="flex flex-col gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-neutral-700 hover:border-amber-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition bg-[#141417]"
              >
                {selectedImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={selectedImage} alt="Preview" className="h-28 object-contain rounded-lg border border-neutral-700" />
                    <span className="text-xs text-amber-400">ছবি পরিবর্তন করতে ক্লিক করুন</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-neutral-300">জুয়েলারি বা যেকোনো পণ্যের ছবি আপলোড করতে ক্লিক করুন</p>
                    <p className="text-xs text-neutral-500 mt-1">PNG, JPG বা WEBP (সাদা ব্যাকগ্রাউন্ডের ছবি সেরা ফলাফল দেয়)</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your 3D model (e.g. A luxury gold lion ring)..."
              rows={3}
              className="w-full bg-[#141417] border border-neutral-700/80 rounded-xl p-4 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 resize-none"
            />
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || (mode === 'text' ? !prompt.trim() : !selectedImage)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-semibold py-3 px-6 rounded-xl transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Processing Model...' : mode === 'image' ? 'Generate 3D from Image' : 'Generate 3D Model'}
          </button>

          {status && (
            <p className="text-center text-xs text-neutral-400 mt-1">
              {status}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}