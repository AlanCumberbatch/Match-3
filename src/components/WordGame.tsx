import { useState, useEffect, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'

type WordPair = [string, string]

const bgColors = [
  '#ffb6c1', // 粉色
  '#98fb98', // 绿色
  '#dda0dd', // 紫色
  '#ffb347', // 橙色
  '#cd853f', // 棕色
  '#87ceeb'  // 蓝色
]

const WordGame = () => {
  const [gameTitle, setGameTitle] = useState('单词消消乐')
  const [wordList, setWordList] = useState<WordPair[]>([])
  const [currentWordPairs, setCurrentWordPairs] = useState(18)
  const [startIndex, setStartIndex] = useState(0)
  const [displayContents, setDisplayContents] = useState<string[]>([])
  const [clickedBlocks, setClickedBlocks] = useState<Set<number>>(new Set())
  const [eliminatedBlocks, setEliminatedBlocks] = useState<Set<number>>(new Set())
  const [mismatchBlocks, setMismatchBlocks] = useState<Set<number>>(new Set())
  const [timeSecond, setTimeSecond] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const lastClickIndexRef = useRef<number | null>(null)
  const timerRef = useRef<number | null>(null)
  const excelFileRef = useRef<HTMLInputElement>(null)
  const txtFileRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 打乱数组
  const shuffleArray = useCallback(<T,>(arr: T[]): T[] => {
    const newArr = [...arr]
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[newArr[i], newArr[j]] = [newArr[j], newArr[i]]
    }
    return newArr
  }, [])

  // 初始化：从 localStorage 加载数据
  useEffect(() => {
    const savedTitle = localStorage.getItem('wordGameTitle')
    if (savedTitle) setGameTitle(savedTitle)

    const savedWordList = localStorage.getItem('wordGameWordList')
    if (savedWordList) {
      const parsed = JSON.parse(savedWordList)
      setWordList(parsed)
      // 初始化渲染
      if (parsed.length > 0) {
        const contents: string[] = []
        for (let i = 0; i < currentWordPairs; i++) {
          if (i >= parsed.length) break
          contents.push(parsed[i][0], parsed[i][1])
        }
        setDisplayContents(shuffleArray(contents))
      }
    }
  }, [shuffleArray, currentWordPairs])

  // 保存标题到 localStorage
  useEffect(() => {
    localStorage.setItem('wordGameTitle', gameTitle)
  }, [gameTitle])

  // 渲染单词面板
  const renderWordPanel = useCallback((words: WordPair[], start: number, pairs: number) => {
    if (words.length === 0) {
      setDisplayContents([])
      return
    }

    const contents: string[] = []
    for (let i = 0; i < pairs; i++) {
      const idx = start / 2 + i
      if (idx >= words.length) break
      contents.push(words[idx][0], words[idx][1])
    }
    setDisplayContents(shuffleArray(contents))
    setClickedBlocks(new Set())
    setEliminatedBlocks(new Set())
    setMismatchBlocks(new Set())
    lastClickIndexRef.current = null
  }, [shuffleArray])

  // 滑块变化
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    setCurrentWordPairs(value)
    if (wordList.length > 0) {
      renderWordPanel(wordList, startIndex, value)
    }
  }

  // 处理 Excel 文件
  const processExcelFile = useCallback(async (file: File) => {
    const isXlsx = file.name.endsWith('.xlsx') &&
      (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.type === '')

    if (!isXlsx) {
      alert('请选择标准.xlsx文件！')
      return false
    }

    try {
      const data = await readExcelFile(file)
      if (data.length === 0) {
        alert('Excel无有效内容！')
        return false
      }

      const shuffled = shuffleArray(data)
      setWordList(shuffled)
      localStorage.setItem('wordGameWordList', JSON.stringify(shuffled))
      setStartIndex(0)
      renderWordPanel(shuffled, 0, currentWordPairs)
      alert(`Excel导入成功！共${data.length}对`)
      return true
    } catch (err) {
      console.error(err)
      alert('Excel解析失败，请使用TXT导入！')
      return false
    }
  }, [shuffleArray, currentWordPairs, renderWordPanel])

  // Excel 导入
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processExcelFile(file)
    e.target.value = ''
  }

  const readExcelFile = (file: File): Promise<WordPair[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsArrayBuffer(file)
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array', cellText: true })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
          const result = json
            .filter(row => {
              const w = (row[0] || '').toString().trim()
              const a = (row[1] || '').toString().trim()
              return w && a
            })
            .map(row => [row[0].trim(), row[1].trim()] as WordPair)
          resolve(result)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
    })
  }

  // 处理 TXT 文件
  const processTxtFile = useCallback((file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!file.name.endsWith('.txt')) {
        alert('请选择TXT文本文件！')
        resolve(false)
        return
      }

      const reader = new FileReader()
      reader.readAsText(file, 'UTF-8')
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string
          const lines = content.split(/\r?\n/).filter(line => line.trim())
          const data: WordPair[] = []
          let errorLineCount = 0

          lines.forEach((line, index) => {
            const trimLine = line.trim()
            if (trimLine.startsWith('#')) return

            const match = trimLine.match(/^\d+[.\s、:：]*\s*(.+?)\s*[:：]\s*(.+)$/)

            if (match && match.length === 3) {
              const enContent = match[1].trim()
              const cnContent = match[2].trim()
              if (enContent && cnContent) {
                data.push([enContent, cnContent])
              } else {
                errorLineCount++
              }
            } else {
              errorLineCount++
              console.warn(`第${index+1}行格式不匹配，已忽略：${trimLine}`)
            }
          })

          if (data.length === 0) {
            alert('TXT中无有效内容！\n请使用格式：1. 英文/短语：中文/短句（支持标点、空格）')
            resolve(false)
            return
          }

          const shuffled = shuffleArray(data)
          setWordList(shuffled)
          localStorage.setItem('wordGameWordList', JSON.stringify(shuffled))
          setStartIndex(0)
          renderWordPanel(shuffled, 0, currentWordPairs)

          let msg = `TXT导入成功！\n共读取${data.length}对有效内容`
          if (errorLineCount > 0) msg += `\n忽略${errorLineCount}行不匹配格式的内容`
          alert(msg)
          resolve(true)
        } catch (err) {
          console.error('TXT解析失败：', err)
          alert('TXT解析失败，请确保：\n1. 编码为UTF-8\n2. 格式为 数字. 英文/短语：中文/短句')
          resolve(false)
        }
      }
      reader.onerror = () => {
        alert('TXT文件读取失败，请确保文件未损坏！')
        resolve(false)
      }
    })
  }, [shuffleArray, currentWordPairs, renderWordPanel])

  // TXT 导入
  const handleTxtImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processTxtFile(file)
    e.target.value = ''
  }

  // 开始游戏
  const handleStart = () => {
    if (wordList.length === 0) {
      alert('请先导入词表/短语表！')
      return
    }
    const shuffled = shuffleArray(wordList)
    setWordList(shuffled)
    localStorage.setItem('wordGameWordList', JSON.stringify(shuffled))
    setStartIndex(0)
    renderWordPanel(shuffled, 0, currentWordPairs)
    resetTimer()
    setIsUnlocked(true)
    startTimer()
    setIsPlaying(true)
  }

  // 继续挑战
  const handleContinue = () => {
    setShowModal(false)
    const newStartIndex = startIndex + currentWordPairs * 2
    const remain = wordList.length * 2 - newStartIndex
    if (remain <= 0) {
      setStartIndex(0)
      alert('内容已全部挑战，重新开始！')
      renderWordPanel(wordList, 0, currentWordPairs)
    } else {
      setStartIndex(newStartIndex)
      renderWordPanel(wordList, newStartIndex, currentWordPairs)
    }
    resetTimer()
    startTimer()
    setIsPlaying(true)
  }

  // 处理方块点击
  const handleBlockClick = (index: number) => {
    if (!isPlaying || clickedBlocks.has(index) || eliminatedBlocks.has(index) || mismatchBlocks.has(index)) {
      return
    }

    const newClicked = new Set(clickedBlocks)
    newClicked.add(index)
    setClickedBlocks(newClicked)

    if (lastClickIndexRef.current === null) {
      lastClickIndexRef.current = index
      return
    }

    const lastIndex = lastClickIndexRef.current
    const lastContent = displayContents[lastIndex]
    const currentContent = displayContents[index]

    const isMatch = wordList.some(pair =>
      (pair[0] === lastContent && pair[1] === currentContent) ||
      (pair[0] === currentContent && pair[1] === lastContent)
    )

    if (isMatch) {
      setTimeout(() => {
        const newEliminated = new Set(eliminatedBlocks)
        newEliminated.add(lastIndex)
        newEliminated.add(index)
        setEliminatedBlocks(newEliminated)
        setClickedBlocks(new Set())
        lastClickIndexRef.current = null
        checkAllEliminated(newEliminated)
      }, 200)
    } else {
      setTimeout(() => {
        const newMismatch = new Set(mismatchBlocks)
        newMismatch.add(lastIndex)
        newMismatch.add(index)
        setMismatchBlocks(newMismatch)
        setTimeout(() => {
          setClickedBlocks(new Set())
          setMismatchBlocks(new Set())
          lastClickIndexRef.current = null
        }, 500)
      }, 200)
    }
  }

  // 检查是否全部消除
  const checkAllEliminated = (eliminated: Set<number>) => {
    if (eliminated.size === displayContents.length && isPlaying) {
      stopTimer()
      setIsPlaying(false)
      setTimeout(() => setShowModal(true), 600)
    }
  }

  // 计时器
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = window.setInterval(() => {
      setTimeSecond(prev => prev + 1)
    }, 1000)
  }

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }

  const resetTimer = () => {
    stopTimer()
    setTimeSecond(0)
  }

  // 统一的文件处理函数
  const handleFile = useCallback(async (file: File) => {
    const fileName = file.name.toLowerCase()

    if (fileName.endsWith('.xlsx')) {
      return await processExcelFile(file)
    } else if (fileName.endsWith('.txt')) {
      return await processTxtFile(file)
    } else {
      alert('不支持的文件格式！\n请拖拽 .xlsx 或 .txt 文件')
      return false
    }
  }, [processExcelFile, processTxtFile])

  // 全局拖拽事件监听（处理从页面外部拖拽的情况）
  useEffect(() => {
    const handleGlobalDragEnter = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // 检查是否真的离开了窗口
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDragging(false)
      }
    }

    const handleGlobalDrop = async (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      if (files.length === 0) return

      // 只处理第一个文件
      const file = files[0]
      await handleFile(file)
    }

    // 添加全局事件监听
    document.addEventListener('dragenter', handleGlobalDragEnter)
    document.addEventListener('dragover', handleGlobalDragOver)
    document.addEventListener('dragleave', handleGlobalDragLeave)
    document.addEventListener('drop', handleGlobalDrop)

    return () => {
      document.removeEventListener('dragenter', handleGlobalDragEnter)
      document.removeEventListener('dragover', handleGlobalDragOver)
      document.removeEventListener('dragleave', handleGlobalDragLeave)
      document.removeEventListener('drop', handleGlobalDrop)
    }
  }, [handleFile])

  // 拖拽事件处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // 只有当离开整个容器时才取消拖拽状态
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    // 只处理第一个文件
    const file = files[0]
    await handleFile(file)
  }

  return (
    <div
      ref={containerRef}
      className={`container max-w-6xl mx-auto relative transition-all duration-300 ${
        isDragging ? 'scale-[0.98]' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽提示遮罩 */}
      {isDragging && (
        <div className="fixed inset-0 z-[1000] bg-gradient-to-br from-pink-500/30 via-purple-500/30 to-blue-500/30 backdrop-blur-md flex items-center justify-center pointer-events-none">
          <div className="bg-white/98 rounded-3xl p-8 md:p-12 shadow-2xl border-4 border-dashed border-pink-400 transform scale-105 transition-transform duration-300">
            <div className="text-center">
              <div className="text-7xl mb-4 animate-bounce">📁</div>
              <h3 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
                松开以导入文件
              </h3>
              <p className="text-lg text-gray-600 font-medium">
                支持 .xlsx 或 .txt 格式
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 可编辑标题 */}
      <h1
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const newTitle = e.currentTarget.innerText.trim() || '单词消消乐'
          e.currentTarget.innerText = newTitle
          setGameTitle(newTitle)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            e.currentTarget.blur()
          }
        }}
        className="text-center text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-green-500 bg-clip-text text-transparent drop-shadow-lg my-5 cursor-pointer transition-all duration-300 hover:scale-105"
        style={{
          textShadow: '0 2px 10px rgba(255,105,180,0.3)'
        }}
      >
        {gameTitle}
      </h1>

      {/* 菜单区域 */}
      <div className="bg-white rounded-3xl shadow-lg p-6 flex flex-col md:flex-row items-start md:items-center justify-around flex-wrap gap-5 mb-5">
        <div className="flex items-center gap-2.5 w-full md:min-w-[250px]">
          <label htmlFor="wordCountSlider" className="text-base md:text-lg text-gray-600 font-medium whitespace-nowrap">
            短语/单词对数：
          </label>
          <input
            type="range"
            id="wordCountSlider"
            min="5"
            max="50"
            value={currentWordPairs}
            onChange={handleSliderChange}
            className="flex-1 h-2.5 rounded-full bg-gradient-to-r from-pink-200 to-purple-200 outline-none appearance-none cursor-pointer"
            style={{
              background: 'linear-gradient(90deg, #ffb6c1, #dda0dd)'
            }}
          />
          <span className="text-base md:text-lg font-bold text-pink-500 min-w-[40px] text-center">
            {currentWordPairs}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <label
            htmlFor="excelFile"
            className="px-4 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg font-medium cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
            style={{
              background: 'linear-gradient(90deg, #ff9a9e, #fad0c4)'
            }}
          >
            导入Excel词表
          </label>
          <input
            ref={excelFileRef}
            type="file"
            id="excelFile"
            accept=".xlsx"
            onChange={handleExcelImport}
            className="hidden"
          />
          <label
            htmlFor="txtFile"
            className="px-4 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg font-medium cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
            style={{
              background: 'linear-gradient(90deg, #4facfe, #00f2fe)'
            }}
          >
            导入TXT词表
          </label>
          <input
            ref={txtFileRef}
            type="file"
            id="txtFile"
            accept=".txt"
            onChange={handleTxtImport}
            className="hidden"
          />
        </div>

        <button
          onClick={handleStart}
          className="px-4 md:px-6 py-2.5 md:py-3 rounded-full text-base md:text-lg font-medium cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg active:translate-y-0 w-full md:w-auto"
          style={{
            background: 'linear-gradient(90deg, #84fab0, #8fd3f4)'
          }}
        >
          {isPlaying ? '重新开始(重置内容)' : '开始游戏'}
        </button>
      </div>

      <p className="text-sm text-gray-500 text-center -mt-4 mb-4 leading-relaxed">
        支持格式：1. active：活跃的 / 8. You have some moves, kid：你有两下子啊，孩子<br />
        自动过滤序号、兼容中英文冒号，支持短语/标点/空格，UTF-8编码<br />
        <span className="text-pink-500 font-medium">💡 提示：可以直接拖拽 .xlsx 或 .txt 文件到页面任意位置进行导入</span>
      </p>

      {/* 耗时显示 */}
      <div className="text-center text-xl md:text-2xl font-bold text-gray-600 bg-white rounded-2xl p-3 md:p-4 mb-8 shadow-md">
        耗时：<span className="text-pink-500" style={{ textShadow: '0 1px 3px rgba(255,105,180,0.2)' }}>
          {timeSecond}
        </span>秒
      </div>

      {/* 单词面板 */}
      <div
        className={`max-w-full mx-auto flex flex-wrap justify-center gap-3 md:gap-4 p-4 md:p-5 bg-white/80 rounded-3xl shadow-lg ${
          isUnlocked ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {displayContents.map((content, index) => {
          const isClicked = clickedBlocks.has(index)
          const isEliminated = eliminatedBlocks.has(index)
          const isMismatch = mismatchBlocks.has(index)
          const bgColor = bgColors[index % bgColors.length]

          return (
            <div
              key={`${content}-${index}`}
              onClick={() => handleBlockClick(index)}
              className={`min-w-[70px] md:min-w-[100px] min-h-[60px] md:min-h-[80px] max-w-[120px] md:max-w-[180px] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl flex items-center justify-center text-center text-xs md:text-base font-medium text-black shadow-md cursor-pointer transition-all duration-200 hover:scale-105 break-words relative overflow-hidden ${
                isClicked ? 'border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)]' : ''
              } ${isEliminated ? 'animate-eliminate pointer-events-none' : ''} ${
                isMismatch ? 'animate-mismatch pointer-events-none' : ''
              }`}
              style={{
                backgroundColor: bgColor
              }}
            >
              {content}
            </div>
          )
        })}
      </div>

      {/* 通关模态框 */}
      {showModal && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-[999] transition-opacity duration-300 ${
            showModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-gradient-to-br from-white to-pink-50 rounded-3xl p-6 md:p-10 text-center shadow-2xl transform transition-transform duration-300 scale-100 mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-pink-500 mb-5" style={{ textShadow: '0 2px 8px rgba(255,105,180,0.3)' }}>
              挑战成功！
            </h2>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              本次耗时：<span className="text-pink-600 font-bold text-xl md:text-2xl">{timeSecond}</span>秒
            </p>
            <button
              onClick={handleContinue}
              className="px-6 md:px-8 py-2.5 md:py-3 rounded-full text-base md:text-lg font-medium cursor-pointer transition-all duration-300 shadow-md hover:-translate-y-1 hover:shadow-lg active:translate-y-0"
              style={{
                background: 'linear-gradient(90deg, #ff69b4, #9370db)'
              }}
            >
              继续挑战
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes eliminate {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; box-shadow: 0 0 20px rgba(255,255,255,1); }
          100% { transform: scale(0); opacity: 0; }
        }
        .animate-eliminate {
          animation: eliminate 0.6s ease forwards;
        }
        @keyframes mismatch {
          0% { background-color: inherit; }
          30% { background-color: #ff4444; }
          60% { background-color: #ff4444; }
          100% { background-color: inherit; }
        }
        .animate-mismatch {
          animation: mismatch 0.5s ease forwards;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #ff69b4;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(255,105,180,0.4);
          transition: all 0.2s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          border-color: #ff477e;
        }
        input[type="range"]::-moz-range-thumb {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #fff;
          border: 3px solid #ff69b4;
          cursor: pointer;
          box-shadow: 0 2px 5px rgba(255,105,180,0.4);
        }
      `}</style>
    </div>
  )
}

export default WordGame
