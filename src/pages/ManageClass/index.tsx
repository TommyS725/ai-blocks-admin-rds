import ManageClass from '@/components/ManageClass'
import Navbar from '@/components/nav'

export default function Home() {
  return (
    <>
    <main>
    <Navbar active="manage_class"/>
    <div className='m-8'>
      <ManageClass/>
    </div>
    </main>
    </>
  )
}
