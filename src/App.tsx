import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Calculator, Info, ShieldAlert, RefreshCw, CheckCircle2, AlertCircle, Search, Navigation, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { anttTables, cargoLabels, calculateFreight, CargoType, Axles } from './data/antt';
import { calculateRouteDetails, calculateBatchRoutes } from './services/routing';
import { BRAZIL_CAPITALS } from './data/capitals';
import { cn } from './lib/utils';

export default function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [distance, setDistance] = useState<number | ''>('');
  const [tolls, setTolls] = useState<number | ''>('');
  const [cargoType, setCargoType] = useState<CargoType>('geral');
  const [axles, setAxles] = useState<Axles>(6);
  const [returnEmpty, setReturnEmpty] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  useEffect(() => {
    // Simulate fetching latest rates
    setLastUpdated(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }, []);

  const handleUpdateRates = () => {
    setIsUpdating(true);
    setTimeout(() => {
      setIsUpdating(false);
      setLastUpdated(new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }));
    }, 1500);
  };

  const handleCalculateRoute = async () => {
    if (!origin || !destination) {
      setRouteError('Preencha a origem e o destino.');
      return;
    }

    setIsCalculatingRoute(true);
    setRouteError(null);

    try {
      const details = await calculateRouteDetails(origin, destination);
      setDistance(details.distance);
      setTolls(details.tolls);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : 'Erro desconhecido ao calcular a rota.');
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const handleExportTable = async () => {
    if (!origin) {
      setRouteError('Preencha a origem para exportar a tabela por UF.');
      return;
    }

    setIsExporting(true);
    setExportProgress(10); // Show initial progress
    setRouteError(null);

    try {
      const batchResults = await calculateBatchRoutes(origin);
      
      setExportProgress(50);

      const results = batchResults.map((routeResult: any, index: number) => {
        const capital = BRAZIL_CAPITALS[index];
        const freight = calculateFreight(routeResult.distance, cargoType, axles, returnEmpty, routeResult.tolls);
        
        return {
          uf: capital.uf,
          capital: capital.city,
          distance: routeResult.distance,
          tolls: routeResult.tolls,
          displacement: freight.displacementCost,
          loading: freight.loadingUnloadingCost,
          total: freight.totalFreight
        };
      });

      setExportProgress(90);

      // Generate CSV
      const csvContent = [
        ['UF', 'Capital Destino', 'Distância (km)', 'Pedágio Estimado (R$)', 'Custo Deslocamento (R$)', 'Carga/Descarga (R$)', 'Frete Mínimo Total (R$)'].join(';'),
        ...results.map((r: any) => [
          r.uf,
          r.capital,
          r.distance,
          r.tolls.toFixed(2).replace('.', ','),
          r.displacement.toFixed(2).replace('.', ','),
          r.loading.toFixed(2).replace('.', ','),
          r.total.toFixed(2).replace('.', ',')
        ].join(';'))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `tabela_frete_${origin.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportProgress(100);
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : 'Erro ao exportar tabela.');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
      }, 1000);
    }
  };

  const distVal = typeof distance === 'number' ? distance : 0;
  const tollsVal = typeof tolls === 'number' ? tolls : 0;

  const result = distVal > 0 
    ? calculateFreight(distVal, cargoType, axles, returnEmpty, tollsVal)
    : null;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-900">Calculadora ANTT</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-500">
            <span className="hidden sm:inline-flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Tabela Atualizada
            </span>
            <button 
              onClick={handleUpdateRates}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-4 h-4", isUpdating && "animate-spin")} />
              <span className="hidden sm:inline">Sincronizar</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Rota Automática */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Navigation className="w-5 h-5 text-blue-600" />
                  Calcular Rota Automática
                </h2>
                <p className="text-sm text-neutral-500 mt-1">Insira as cidades para buscar a distância e uma estimativa de pedágio, ou exporte uma tabela completa para todos os estados.</p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Origem</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input 
                        type="text" 
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder="Ex: São Paulo, SP"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Destino</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                      <input 
                        type="text" 
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder="Ex: Rio de Janeiro, RJ"
                      />
                    </div>
                  </div>
                </div>

                {routeError && (
                  <div className="text-sm text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    {routeError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleCalculateRoute}
                    disabled={isCalculatingRoute || !origin || !destination || isExporting}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-neutral-900 text-white rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isCalculatingRoute ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    {isCalculatingRoute ? 'Buscando rota...' : 'Buscar Distância'}
                  </button>
                  
                  <button
                    onClick={handleExportTable}
                    disabled={isExporting || !origin || isCalculatingRoute}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-2.5 bg-white border border-neutral-300 text-neutral-700 rounded-xl hover:bg-neutral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {isExporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Exportando ({exportProgress}/{BRAZIL_CAPITALS.length})
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        Exportar Tabela por UF
                      </>
                    )}
                  </button>
                </div>
                
                {isExporting && (
                  <div className="w-full bg-neutral-100 rounded-full h-1.5 mt-2">
                    <div 
                      className="bg-blue-600 h-1.5 rounded-full transition-all duration-300" 
                      style={{ width: `${(exportProgress / BRAZIL_CAPITALS.length) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Dados da Viagem */}
            <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  Dados do Veículo e Ajustes
                </h2>
                <p className="text-sm text-neutral-500 mt-1">Revise a distância, pedágio e informe o tipo de veículo.</p>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Distance */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Distância (km)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min="0"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-4 pr-12 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder="Ex: 450"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">km</span>
                    </div>
                  </div>

                  {/* Tolls */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Pedágio Total (R$)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">R$</span>
                      <input 
                        type="number" 
                        min="0"
                        step="0.01"
                        value={tolls}
                        onChange={(e) => setTolls(e.target.value ? Number(e.target.value) : '')}
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        placeholder="0,00"
                      />
                    </div>
                    <p className="text-xs text-neutral-400">Pode ser ajustado manualmente.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Cargo Type */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Tipo de Carga</label>
                    <select 
                      value={cargoType}
                      onChange={(e) => setCargoType(e.target.value as CargoType)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                      {Object.entries(cargoLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Axles */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-neutral-700">Número de Eixos</label>
                    <select 
                      value={axles}
                      onChange={(e) => setAxles(Number(e.target.value) as Axles)}
                      className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none appearance-none"
                    >
                      {[2, 3, 4, 5, 6, 7, 9].map((num) => (
                        <option key={num} value={num}>{num} Eixos</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Return Empty Toggle */}
                <div className="pt-2">
                  <label className="flex items-center gap-3 p-4 border border-neutral-200 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors">
                    <div className="relative flex items-center">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={returnEmpty}
                        onChange={(e) => setReturnEmpty(e.target.checked)}
                      />
                      <div className={cn(
                        "w-11 h-6 rounded-full transition-colors",
                        returnEmpty ? "bg-blue-600" : "bg-neutral-300"
                      )}>
                        <div className={cn(
                          "absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform",
                          returnEmpty ? "translate-x-5" : "translate-x-0"
                        )} />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-neutral-900">Retorno Vazio (Ida e Volta)</div>
                      <div className="text-xs text-neutral-500">O veículo retornará sem carga ao ponto de origem</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Alert */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Sobre a Tabela ANTT</p>
                <p className="opacity-90">Os valores calculados representam o piso mínimo de frete estabelecido pela Resolução ANTT. O não pagamento do piso sujeita o infrator a multas. Tabela base: {lastUpdated}.</p>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="lg:col-span-5">
            <div className="bg-neutral-900 text-white rounded-2xl shadow-xl overflow-hidden sticky top-24">
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-medium flex items-center gap-2 text-neutral-300 mb-6">
                  <Calculator className="w-5 h-5" />
                  Resumo do Frete
                </h2>

                {result ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Custo de Deslocamento</span>
                        <span className="font-mono">R$ {result.displacementCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Carga e Descarga (CC)</span>
                        <span className="font-mono">R$ {result.loadingUnloadingCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-neutral-400">Pedágio Estimado</span>
                        <span className="font-mono">R$ {result.tolls.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>

                    <div className="h-px bg-neutral-800 w-full" />

                    <div>
                      <div className="text-sm text-neutral-400 mb-1">Valor Mínimo Total</div>
                      <div className="text-4xl font-light tracking-tight text-white">
                        <span className="text-2xl text-neutral-500 mr-1">R$</span>
                        {result.totalFreight.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-800">
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Custo por km</div>
                        <div className="font-mono text-sm text-neutral-300">R$ {result.costPerKm.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Distância Total</div>
                        <div className="font-mono text-sm text-neutral-300">{returnEmpty ? distVal * 2 : distVal} km</div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                    <Truck className="w-12 h-12 mb-4 text-neutral-600" />
                    <p className="text-sm">Informe a distância ou busque<br/>uma rota para calcular o frete</p>
                  </div>
                )}
              </div>
              
              {/* Footer of card */}
              <div className="bg-neutral-950 p-4 text-xs text-neutral-500 flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500/70" />
                <p>Valores de referência baseados na Política Nacional de Pisos Mínimos do Transporte Rodoviário de Cargas (PNPM-TRC).</p>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

