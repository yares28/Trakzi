import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { type Metadata } from 'next'
import { isAdminUser, getAdminEnv } from '@/lib/admin'
import AdminPage from './_page/AdminPage'

export const metadata: Metadata = {
  title: 'Internal — Trakzi',
  robots: { index: false, follow: false },
}

export default async function AdminRoute() {
  const { userId } = await auth()

  if (!userId || !isAdminUser(userId)) {
    redirect('/')
  }

  const env = getAdminEnv()

  return <AdminPage env={env} />
}
