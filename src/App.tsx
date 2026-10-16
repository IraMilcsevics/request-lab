import styles from './App.module.css'
import { RequestComposer } from './components/RequestComposer'
import { ResponseDiffPanel } from './components/ResponseDiffPanel'
import { ResponsePanel } from './components/ResponsePanel'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { useRequestLab } from './hooks/useRequestLab'

function App() {
  const lab = useRequestLab()
  const activeEnvironmentName = lab.environments.find((env) => env.id === lab.activeEnvironmentId)?.name
  const compareEntries = lab.history.filter((h) => lab.compareIds.includes(h.id))

  return (
    <div className={styles.app}>
      <TopBar
        method={lab.draft.method}
        url={lab.draft.url}
        timeoutMs={lab.draft.timeoutMs}
        sending={lab.sendState === 'loading'}
        activeEnvironmentName={activeEnvironmentName}
        onMethodChange={lab.setMethod}
        onUrlChange={lab.setUrl}
        onTimeoutChange={lab.setTimeoutMs}
        onSend={lab.send}
        onSaveCurrent={lab.saveCurrent}
        onShowEnvironments={() => lab.setSidebarTab('env')}
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
          onDuplicateSaved={lab.duplicateSaved}
          collections={lab.collections}
          onAddCollection={lab.addCollection}
          onDeleteCollection={lab.deleteCollection}
          onRenameCollection={lab.renameCollection}
          onMoveSavedToCollection={lab.moveSavedToCollection}
          onExportSaved={lab.exportSaved}
          onImportSaved={lab.importSaved}
          onClearHistory={lab.clearHistory}
          onDeleteHistoryEntry={lab.deleteHistoryEntry}
          compareIds={lab.compareIds}
          onToggleCompare={lab.toggleCompareSelection}
          onClearCompare={lab.clearCompareSelection}
          onStartCompare={lab.startCompare}
          environments={lab.environments}
          activeEnvironmentId={lab.activeEnvironmentId}
          onSelectEnvironment={lab.setActiveEnvironment}
          onAddEnvironment={lab.addEnvironment}
          onDeleteEnvironment={lab.deleteEnvironment}
          onRenameEnvironment={lab.renameEnvironment}
          onEnvironmentVariablesChange={lab.setEnvironmentVariables}
        />

        <div className={styles.main}>
          {lab.comparing && compareEntries.length === 2 ? (
            <ResponseDiffPanel entries={[compareEntries[0], compareEntries[1]]} onClose={lab.exitCompare} />
          ) : (
            <>
              <RequestComposer
                method={lab.draft.method}
                url={lab.draft.url}
                params={lab.draft.params}
                headers={lab.draft.headers}
                body={lab.draft.body ?? ''}
                timeoutMs={lab.draft.timeoutMs}
                envVariables={lab.activeVariables}
                activeTab={lab.reqTab}
                onTabChange={lab.setReqTab}
                onParamsChange={lab.setParams}
                onHeadersChange={lab.setHeaders}
                onBodyChange={lab.setBody}
                onImportCurl={lab.importCurl}
              />

              <ResponsePanel
                sendState={lab.sendState}
                result={lab.result}
                activeTab={lab.resTab}
                onTabChange={lab.setResTab}
                onCancel={lab.cancel}
                onExtractVariable={lab.extractToVariable}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
