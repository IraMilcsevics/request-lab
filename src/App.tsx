import styles from './App.module.css'
import { RequestComposer } from './components/RequestComposer'
import { ResponsePanel } from './components/ResponsePanel'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useRequestLab } from './hooks/useRequestLab'

function App() {
  const lab = useRequestLab()

  return (
    <div className={styles.app}>
      <TopBar
        method={lab.draft.method}
        url={lab.draft.url}
        sending={lab.sendState === 'loading'}
        onMethodChange={lab.setMethod}
        onUrlChange={lab.setUrl}
        onSend={lab.send}
        onSaveCurrent={lab.saveCurrent}
      />

      <div className={styles.bodyRow}>
        <Sidebar
          activeTab={lab.sidebarTab}
          onTabChange={lab.setSidebarTab}
          filter={lab.filter}
          onFilterChange={lab.setFilter}
          history={lab.history}
          saved={lab.saved}
          selectedHistoryId={lab.selectedHistoryId}
          onSelectHistory={lab.loadFromHistory}
          onSelectSaved={lab.loadSaved}
          onDeleteSaved={lab.deleteSaved}
        />

        <div className={styles.main}>
          <RequestComposer
            method={lab.draft.method}
            params={lab.draft.params}
            headers={lab.draft.headers}
            body={lab.draft.body ?? ''}
            activeTab={lab.reqTab}
            onTabChange={lab.setReqTab}
            onParamsChange={lab.setParams}
            onHeadersChange={lab.setHeaders}
            onBodyChange={lab.setBody}
          />

          <ResponsePanel
            sendState={lab.sendState}
            result={lab.result}
            activeTab={lab.resTab}
            onTabChange={lab.setResTab}
            onCancel={lab.cancel}
          />
        </div>
      </div>
    </div>
  )
}

export default App
