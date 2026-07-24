import App from './App'
import Auth from './Auth'
import Shop from './Shop'
import Admin from './Admin'
import { useRoute } from './router'

export default function Root() {
  const path = useRoute()
  if (path === '/login') return <Auth initial="login" />
  if (path === '/signup') return <Auth initial="signup" />
  if (path === '/shop') return <Shop />
  if (path === '/admin') return <Admin />
  return <div className="landing-scope"><App /></div>
}
