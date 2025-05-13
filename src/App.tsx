import React from 'react'
import { useState, useRef, useEffect } from 'react'
import './App.css'

function App() {
  const [selectedFiles, setSelectedFiles] = useState<{ [key: string]: File[] }>({
    sample1: [],
    sample2: [],
    format: []
  })
  const [isProcessing, setIsProcessing] = useState(false)
  const [message, setMessage] = useState('')
  const [showContinueButton, setShowContinueButton] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState<string[]>([])
  const [stateOutput, setStateOutput] = useState<any>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const fileInputRefs = {
    sample1: useRef<HTMLInputElement>(null),
    sample2: useRef<HTMLInputElement>(null),
    format: useRef<HTMLInputElement>(null)
  }

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight
    }
  }, [terminalOutput])

  const handleFileSelect = (category: string, files: FileList | null) => {
    if (files) {
      setSelectedFiles(prev => ({
        ...prev,
        [category]: Array.from(files)
      }))
    }
  }

  const handleStartProcessing = async () => {
    setIsProcessing(true)
    setShowContinueButton(false)
    setMessage('処理を開始しています...')
    setTerminalOutput([])
    setStateOutput(null)

    try {
      // Check if any files are missing
      const missingFiles = []
      if (!selectedFiles.sample1.length) missingFiles.push('サンプル1')
      if (!selectedFiles.sample2.length) missingFiles.push('サンプル2')
      if (!selectedFiles.format.length) missingFiles.push('フォーマット')

      if (missingFiles.length > 0) {
        setMessage(`警告: ${missingFiles.join(', ')}のファイルが未選択です。`)
        setShowContinueButton(true)
        setIsProcessing(false)
        return
      }

      await processFiles()
    } catch (error) {
      setMessage('エラーが発生しました。')
      setIsProcessing(false)
    }
  }

  const processFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/process', {
        method: 'GET',
      })

      if (!response.ok) {
        throw new Error('Server returned an error response')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No reader available')
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const text = decoder.decode(value)
        const lines = text.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const data = JSON.parse(line)
            if (!data.type || !data.content) {
              console.error('Invalid data format:', data)
              continue
            }

            switch (data.type) {
              case 'terminal':
                setTerminalOutput(prev => [...prev, data.content])
                break
              case 'state':
                setStateOutput(prev => ({
                  ...prev,
                  ...data.content
                }))
                break
              case 'error':
                setTerminalOutput(prev => [...prev, `Error: ${data.content}`])
                setMessage(`エラーが発生しました: ${data.content}`)
                break
              default:
                console.warn('Unknown message type:', data.type)
            }
          } catch (e) {
            console.error('Error parsing line:', e)
            setTerminalOutput(prev => [...prev, `Error: Failed to parse server response`])
          }
        }
      }

      setMessage('処理が完了しました！')
    } catch (error) {
      console.error('Error:', error)
      setMessage(`エラーが発生しました: ${error.message}`)
      setTerminalOutput(prev => [...prev, `Error: ${error.message}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleContinueProcessing = async () => {
    setIsProcessing(true)
    setShowContinueButton(false)
    await processFiles()
  }

  const renderFileInput = (category: string, label: string) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="file"
        ref={fileInputRefs[category as keyof typeof fileInputRefs]}
        onChange={(e) => handleFileSelect(category, e.target.files)}
        accept=".jpg,.jpeg,.png,.xlsx"
        className="block w-full text-sm text-gray-500
          file:mr-4 file:py-2 file:px-4
          file:rounded-md file:border-0
          file:text-sm file:font-semibold
          file:bg-blue-50 file:text-blue-700
          hover:file:bg-blue-100"
        multiple={category !== 'format'}
      />
      <div className="mt-2 text-sm text-gray-500">
        {selectedFiles[category].length > 0 
          ? `選択されたファイル: ${selectedFiles[category].map(f => f.name).join(', ')}` 
          : 'ファイルが選択されていません'}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-900 mb-8">
            LangGraph処理ツール
          </h1>
          
          <div className="space-y-6">
            {renderFileInput('sample1', 'サンプル1のファイル')}
            {renderFileInput('sample2', 'サンプル2のファイル')}
            {renderFileInput('format', 'フォーマットファイル')}

            <div className="flex flex-col space-y-4">
              {!showContinueButton && (
                <button
                  onClick={handleStartProcessing}
                  disabled={isProcessing}
                  className={`w-full py-3 px-4 rounded-md text-white font-medium
                    ${isProcessing 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {isProcessing ? '処理中...' : '処理開始'}
                </button>
              )}

              {showContinueButton && (
                <button
                  onClick={handleContinueProcessing}
                  className="w-full py-3 px-4 rounded-md text-white font-medium bg-yellow-600 hover:bg-yellow-700"
                >
                  警告を無視して続行
                </button>
              )}
            </div>

            {message && (
              <div className={`mt-4 p-4 rounded-md ${
                message.includes('エラー') 
                  ? 'bg-red-50 text-red-700' 
                  : message.includes('警告')
                  ? 'bg-yellow-50 text-yellow-700'
                  : 'bg-green-50 text-green-700'
              }`}>
                {message}
              </div>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">実行ログ</h2>
                <div
                  ref={terminalRef}
                  className="bg-gray-900 text-gray-100 p-4 rounded-md h-48 overflow-y-auto font-mono text-sm"
                >
                  {terminalOutput.map((line, index) => (
                    <div key={index} className="whitespace-pre-wrap">{line}</div>
                  ))}
                </div>
              </div>

              {stateOutput && (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">LangGraph State</h2>
                  <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(stateOutput, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App