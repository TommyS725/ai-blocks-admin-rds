import { Inter } from 'next/font/google'
import Navbar from '@/components/nav'

const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  return (
    <>
    <main>
    <Navbar/>
    </main>
    </>
  )
}
