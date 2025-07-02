'use client'
import { createContext } from 'react'

const SessionContext = createContext({
    expires: '',
})

export default SessionContext
