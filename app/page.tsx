'use client'

import { useState, useEffect, useRef } from 'react'

interface Agent {
  id: string
  name: string
  icon: string
  description: string
  personality: string
}

const agents: Agent[] = [
  {
    id: 'assistant',
    name: 'Assistant',
    icon: '🤖',
    description: 'General purpose helpful assistant',
    personality: 'I am a helpful AI assistant ready to answer your questions and help with tasks.'
  },
  {
    id: 'teacher',
    name: 'Teacher',
    icon: '👩‍🏫',
    description: 'Educational guide and tutor',
    personality: 'I am an enthusiastic teacher who loves to explain concepts and help people learn new things.'
  },
  {
    id: 'coach',
    name: 'Coach',
    icon: '💪',
    description: 'Motivational life and wellness coach',
    personality: 'I am an energetic coach here to motivate you and help you achieve your goals!'
  },
  {
    id: 'storyteller',
    name: 'Storyteller',
    icon: '📚',
    description: 'Creative narrative creator',
    personality: 'I am a creative storyteller who loves to weave tales and spark imagination.'
  }
]

export default function Home() {
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set())
  const [listeningAgents, setListeningAgents] = useState<Set<string>>(new Set())
  const [speakingAgents, setSpeakingAgents] = useState<Set<string>>(new Set())
  const [transcripts, setTranscripts] = useState<Record<string, string>>({})
  const [supportsSpeech, setSupportsSpeech] = useState(false)

  const recognitionRefs = useRef<Record<string, any>>({})
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setSupportsSpeech(!!SpeechRecognition && 'speechSynthesis' in window)

    if ('speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis
    }
  }, [])

  const startAgent = (agentId: string) => {
    setActiveAgents(prev => new Set(prev).add(agentId))
    setTranscripts(prev => ({ ...prev, [agentId]: '' }))

    const agent = agents.find(a => a.id === agentId)
    if (agent && synthRef.current) {
      const utterance = new SpeechSynthesisUtterance(
        `Hello! ${agent.personality} How can I help you today?`
      )
      utterance.rate = 1.0
      utterance.pitch = 1.0

      setSpeakingAgents(prev => new Set(prev).add(agentId))
      utterance.onend = () => {
        setSpeakingAgents(prev => {
          const next = new Set(prev)
          next.delete(agentId)
          return next
        })
      }

      synthRef.current.speak(utterance)
    }
  }

  const stopAgent = (agentId: string) => {
    if (recognitionRefs.current[agentId]) {
      recognitionRefs.current[agentId].stop()
      delete recognitionRefs.current[agentId]
    }

    setActiveAgents(prev => {
      const next = new Set(prev)
      next.delete(agentId)
      return next
    })
    setListeningAgents(prev => {
      const next = new Set(prev)
      next.delete(agentId)
      return next
    })
    setSpeakingAgents(prev => {
      const next = new Set(prev)
      next.delete(agentId)
      return next
    })
  }

  const startListening = (agentId: string) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setListeningAgents(prev => new Set(prev).add(agentId))
    }

    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      let finalTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }

      setTranscripts(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || '') + (finalTranscript || interimTranscript)
      }))

      if (finalTranscript) {
        respondToSpeech(agentId, finalTranscript.trim())
      }
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      setListeningAgents(prev => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }

    recognition.onend = () => {
      setListeningAgents(prev => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }

    recognitionRefs.current[agentId] = recognition
    recognition.start()
  }

  const respondToSpeech = (agentId: string, userSpeech: string) => {
    const agent = agents.find(a => a.id === agentId)
    if (!agent || !synthRef.current) return

    let response = ''
    const lowerSpeech = userSpeech.toLowerCase()

    // Simple response logic based on keywords
    if (lowerSpeech.includes('hello') || lowerSpeech.includes('hi')) {
      response = 'Hello! It\'s great to hear from you. What would you like to talk about?'
    } else if (lowerSpeech.includes('how are you')) {
      response = 'I\'m doing wonderfully, thank you for asking! How are you doing today?'
    } else if (lowerSpeech.includes('help')) {
      response = 'I\'m here to help! You can ask me questions, have a conversation, or just chat. What do you need?'
    } else if (lowerSpeech.includes('thank')) {
      response = 'You\'re very welcome! Is there anything else I can help you with?'
    } else if (lowerSpeech.includes('bye') || lowerSpeech.includes('goodbye')) {
      response = 'Goodbye! It was great talking with you. Have a wonderful day!'
    } else if (lowerSpeech.includes('story')) {
      response = 'Once upon a time, there was a curious person who discovered the magic of voice AI. They found they could talk to intelligent agents anytime they wanted!'
    } else if (lowerSpeech.includes('joke')) {
      response = 'Why did the AI go to therapy? Because it had too many deep learning issues!'
    } else {
      response = `That's interesting! You mentioned: "${userSpeech}". ${agent.personality} What else would you like to discuss?`
    }

    const utterance = new SpeechSynthesisUtterance(response)
    utterance.rate = 1.0
    utterance.pitch = 1.0

    setSpeakingAgents(prev => new Set(prev).add(agentId))
    utterance.onend = () => {
      setSpeakingAgents(prev => {
        const next = new Set(prev)
        next.delete(agentId)
        return next
      })
    }

    setTranscripts(prev => ({
      ...prev,
      [agentId]: (prev[agentId] || '') + `\n\n${agent.name}: ${response}`
    }))

    synthRef.current.speak(utterance)
  }

  const stopListening = (agentId: string) => {
    if (recognitionRefs.current[agentId]) {
      recognitionRefs.current[agentId].stop()
    }
  }

  const getStatus = (agentId: string) => {
    if (speakingAgents.has(agentId)) return 'speaking'
    if (listeningAgents.has(agentId)) return 'listening'
    if (activeAgents.has(agentId)) return 'active'
    return 'idle'
  }

  return (
    <div className="container">
      <div className="header">
        <h1>🎙️ Voice Agents</h1>
        <p>AI-powered voice interaction with multiple personalities</p>
      </div>

      {!supportsSpeech && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '2rem',
          color: 'white',
          textAlign: 'center'
        }}>
          ⚠️ Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.
        </div>
      )}

      <div className="agents-grid">
        {agents.map(agent => {
          const status = getStatus(agent.id)
          const isActive = activeAgents.has(agent.id)
          const isListening = listeningAgents.has(agent.id)
          const isSpeaking = speakingAgents.has(agent.id)

          return (
            <div key={agent.id} className="agent-card">
              <div className="agent-header">
                <div className={`agent-icon ${isSpeaking ? 'wave' : ''}`}>
                  {agent.icon}
                </div>
                <div className="agent-info">
                  <h2>{agent.name}</h2>
                  <p>{agent.description}</p>
                </div>
              </div>

              <div className="controls">
                {!isActive ? (
                  <button
                    className="btn btn-primary"
                    onClick={() => startAgent(agent.id)}
                    disabled={!supportsSpeech}
                  >
                    ▶️ Start Agent
                  </button>
                ) : (
                  <>
                    <div className={`status ${
                      isSpeaking ? 'status-speaking' :
                      isListening ? 'status-listening pulse' :
                      'status-idle'
                    }`}>
                      {isSpeaking ? '🔊 Speaking...' :
                       isListening ? '🎤 Listening...' :
                       '✓ Active'}
                    </div>

                    {!isListening && !isSpeaking && (
                      <button
                        className="btn btn-primary"
                        onClick={() => startListening(agent.id)}
                      >
                        🎤 Start Talking
                      </button>
                    )}

                    {isListening && (
                      <button
                        className="btn btn-secondary"
                        onClick={() => stopListening(agent.id)}
                      >
                        ⏸️ Stop Listening
                      </button>
                    )}

                    <button
                      className="btn btn-danger"
                      onClick={() => stopAgent(agent.id)}
                    >
                      ⏹️ Stop Agent
                    </button>
                  </>
                )}
              </div>

              {isActive && transcripts[agent.id] && (
                <div style={{ marginTop: '1rem' }}>
                  <div className="transcript-label">Conversation:</div>
                  <div className="transcript">
                    {transcripts[agent.id] || 'Say something...'}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="features">
        <h3>✨ Features</h3>
        <ul>
          <li>Real-time speech recognition using Web Speech API</li>
          <li>Natural text-to-speech responses</li>
          <li>Multiple AI agent personalities</li>
          <li>Interactive voice conversations</li>
          <li>Live conversation transcripts</li>
          <li>Beautiful, responsive interface</li>
        </ul>
      </div>
    </div>
  )
}
