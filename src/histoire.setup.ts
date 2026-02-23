// Histoire global setup
import '@/style.css'
import { createPinia, setActivePinia } from 'pinia'

// Create a shared Pinia instance and also set it as the active Pinia
// for module-level store usage during story collection.
const pinia = createPinia()
setActivePinia(pinia)

// Histoire は setupFile でアプリにプラグインを注入できます。
// default export の setup が呼ばれると app に Pinia を登録します。
/**
 * Histoire セットアップ関数。Vue アプリに Pinia プラグインを登録する。
 * @param app - Vue アプリケーションインスタンス
 */
export default function setup(app: any) {
	app.use(pinia)
}
