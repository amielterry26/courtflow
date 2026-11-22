import { createContext, useContext } from 'react'

// Which list the admin is looking at (Adult or Youth) — set by the toggle in the admin header
export const AdminDivision = createContext('adult')
export const useAdminDivision = () => useContext(AdminDivision)
