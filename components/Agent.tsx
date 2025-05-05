/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import Image from 'next/image'
import React, {useEffect, useState} from 'react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { vapi } from '@/lib/vapi.sdk'

enum CallStatus {
    INACTIVE = "INACTIVE",
    ACTIVE = "ACTIVE",
    CONNECTING = "CONNECTING",
    FINISHED = "FINISHED",
}

interface SavedMessage{
    role: 'user' | 'assistant' | 'system'
    content: string
}

const Agent = ({userName, userId, type} : AgentProps) => {

    const router = useRouter()
    const [isSpeaking, setisSpeaking] = useState(false)
    const [callStatus, setcallStatus] = useState<CallStatus>(CallStatus.INACTIVE)
    
    const [messages, setMessages] = useState<SavedMessage[]>([])

    useEffect(() => {
        const onCallStart = () => setcallStatus(CallStatus.ACTIVE)
        const onCallEnd = () => setcallStatus(CallStatus.FINISHED)

        const onMessage = (message: Message) => {
            if(message.type === 'transcript' && message.transcriptType === 'final') {
                const newMessage = {
                    role: message.role,
                    content: message.transcript
                }
                setMessages((prevMessages) => [...prevMessages, newMessage])
            }
        }

        const onSpeechStart = () => setisSpeaking(true)
        const onSpeechEnd = () => setisSpeaking(false)

        const onError = (error: { error?: { type: string; msg: string } }) => {
            console.error('Error:', error);
            if (error.error?.type === 'ejected') {
                console.warn('Meeting ended:', error.error.msg);
                setcallStatus(CallStatus.FINISHED);
            }
        };

        vapi.on('call-start', onCallStart)
        vapi.on('call-end', onCallEnd)
        vapi.on('message', onMessage)
        vapi.on('speech-start', onSpeechStart)
        vapi.on('speech-end', onSpeechEnd)
        vapi.on('error', onError)

        return () => {
            vapi.off('call-start', onCallStart)
            vapi.off('call-end', onCallEnd)
            vapi.off('message', onMessage)
            vapi.off('speech-start', onSpeechStart)
            vapi.off('speech-end', onSpeechEnd)
            vapi.off('error', onError)
        }
    }, [])

    useEffect(() => {
        if (callStatus === CallStatus.FINISHED) {
            router.push('/')
        }
    }, [messages, callStatus, userId, type, router])

    const handleCall = async () => {
        setcallStatus(CallStatus.CONNECTING)
        await vapi.start(process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!, {
            variableValues :{
                username: userName,
                userid: userId,
            }
        })
    }

    const handleDisconnect = async () => {
        setcallStatus(CallStatus.FINISHED)
        vapi.stop()
    }

    const latestMessage = messages[messages.length - 1]?.content

    const isCallInactiveOrFinished = callStatus === CallStatus.INACTIVE || callStatus === CallStatus.FINISHED
  return (
    <>
        <div className='call-view'>
            <div className="card-interviewer">
                <div className="avatar">
                    <Image src="/ai-avatar.png" alt="AI Avatar" width={65} height={54} className='object-cover'/>
                    {isSpeaking && <span className="animate-speak"></span>}
                </div>
                <h3>AI Interviewer</h3>
            </div>
            <div className='card-border'>
                <div className='card-content'>
                    <Image src="/user-avatar.png" alt="User Avatar" width={540} height={540} className='object-cover rounded-full size-[120px]'/>
                    <h3>{userName}</h3>
                </div>
            </div>
        </div>
        {messages.length > 0 && (
            <div className='transcript-border'>
                <div className='transcript'>
                    <p key={latestMessage} className={cn('transition-opacity duration-500 opacity-0', 'animate-fadeIn opacity-100')}>
                        {latestMessage}
                    </p>
                </div>
            </div>
        )}
        <div className='w-full flex justify-center'>
            {callStatus !== CallStatus.ACTIVE ? (
                <button className='btn-call relative' onClick={handleCall}>
                    <span className={cn('absolute animate-ping rounded-full opacity-25', callStatus === CallStatus.CONNECTING && 'hidden')} />
                    <span>{isCallInactiveOrFinished ? 'Call' : '. . .'}</span>
                </button>
            ) : (
                <button className='btn-disconnect' onClick={handleDisconnect}>
                    End
                </button>
            )
            }
        </div>
    </>
  )
}

export default Agent