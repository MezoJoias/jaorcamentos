/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { supabase } from './lib/supabaseClient'
import { calcularPortaoDeslizante } from './regras/portaoDeslizante'
import { calcularPortaoSocial } from './regras/portaoSocial'

const SERVICE_OPTIONS = [
  { value: 'portao', label: 'Portão deslizante' },
  { value: 'portao_social', label: 'Portão social' },
/*   { value: 'grade', label: 'Grade' },
  { value: 'corrimao', label: 'Corrimão' },
  { value: 'estrutura', label: 'Estrutura' },
  { value: 'outro', label: 'Outro' }, */
]
const STATUS_OPTIONS = [
  { value: 'aberto', label: 'Em aberto' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'recusado', label: 'Recusado' },
  { value: 'concluido', label: 'Concluído' },
]
const UNIT_OPTIONS = [
  ['barra 6m', 'Barra de 6 metros'], ['metro', 'Metro'], ['m²', 'Metro quadrado'], ['unidade', 'Unidade'],
]
const emptyQuote = {
  cliente: '', telefone: '', tipoServico: 'portao', quantidade: 1, largura: '', altura: '', observacoes: '', multiplicador: 2.2,
}
const money = (value) => Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const number = (value) => Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const normalize = (value) => String(value || '').toLowerCase().replaceAll('×', 'x').replace(/\s+/g, '')
const dateBR = (value) => value ? new Date(value).toLocaleDateString('pt-BR') : '—'
const serviceLabel = (value) => SERVICE_OPTIONS.find((x) => x.value === value)?.label || value || '—'
const phoneDigits = (value) => String(value || '').replace(/\D/g, '')

function App() {
  const [sessao, setSessao] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [pagina, setPagina] = useState('dashboard')
  const [materiais, setMateriais] = useState([])
  const [clientes, setClientes] = useState([])
  const [orcamentos, setOrcamentos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [toast, setToast] = useState('')
  const [quote, setQuote] = useState(emptyQuote)
  const [resultado, setResultado] = useState(null)
  const [salvandoOrcamento, setSalvandoOrcamento] = useState(false)
  const [orcamentoSelecionado, setOrcamentoSelecionado] = useState(null)
  const [clienteHistorico, setClienteHistorico] = useState(null)
  const [filtroOrcamentos, setFiltroOrcamentos] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('todos')
  const [mostrarNovoMaterial, setMostrarNovoMaterial] = useState(false)
  const [materialEditando, setMaterialEditando] = useState(null)
  const [novoMaterialNome, setNovoMaterialNome] = useState('')
  const [novoMaterialUnidade, setNovoMaterialUnidade] = useState('barra 6m')
  const [novoMaterialPreco, setNovoMaterialPreco] = useState('')
  const [editMaterialNome, setEditMaterialNome] = useState('')
  const [editMaterialUnidade, setEditMaterialUnidade] = useState('')
  const [editMaterialPreco, setEditMaterialPreco] = useState('')
  const [filtroMateriais, setFiltroMateriais] = useState('')
  const [mostrarNovoCliente, setMostrarNovoCliente] = useState(false)
  const [clienteEditando, setClienteEditando] = useState(null)
  const [novoClienteNome, setNovoClienteNome] = useState('')
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('')
  const [filtroClientes, setFiltroClientes] = useState('')

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => { if (ativo) { setSessao(data.session); setAuthLoading(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { setSessao(session); setAuthLoading(false) })
    return () => { ativo = false; listener.subscription.unsubscribe() }
  }, [])

  const avisar = (mensagem) => { setToast(mensagem); window.setTimeout(() => setToast(''), 3000) }

  const carregarDados = async () => {
    setCarregando(true); setErro('')
    const [m, c, o] = await Promise.all([
      supabase.from('materiais').select('*').order('id', { ascending: true }),
      supabase.from('clientes').select('*').order('id', { ascending: false }),
      supabase.from('orcamentos').select('*').order('id', { ascending: false }),
    ])
    if (m.error) setErro('Não foi possível carregar os materiais. Confira o SQL do Supabase.')
    else setMateriais(m.data || [])
    if (c.error) console.error(c.error); else setClientes(c.data || [])
    if (o.error) console.error(o.error); else setOrcamentos(o.data || [])
    setCarregando(false)
  }
  useEffect(() => { if (sessao) carregarDados() }, [sessao])

  const materialPorNome = (nome) => materiais.find((item) => normalize(item.nome) === normalize(nome))

  const calcularOrcamento = () => {
    const largura = Number(String(quote.largura).replace(',', '.'))
    const altura = Number(String(quote.altura).replace(',', '.'))
    const quantidade = Math.max(1, Number(quote.quantidade) || 1)
    const multiplicador = Math.max(0, Number(String(quote.multiplicador).replace(',', '.')) || 0)

    if (!(largura > 0) || !(altura > 0)) return alert('Informe largura e altura maiores que zero.')

    const base = { area: largura * altura, perimetro: (largura + altura) * 2, quantidade, multiplicador }

    let regra
    if (quote.tipoServico === 'portao_social') {
      regra = calcularPortaoSocial({ largura, altura, quantidade })
    } else if (quote.tipoServico === 'portao') {
      regra = calcularPortaoDeslizante({ largura, altura, quantidade })
    } else {
      setResultado({ tipo: 'sem-regra', ...base })
      return
    }

    if (!regra) return

    const getMaterial = (nome) => materialPorNome(nome)
    const tubo30Material = getMaterial('Tubo 30x30')
    const tubo20Material = getMaterial('Tubo 20x30')
    const trilhoMaterial = getMaterial('Trilho')
    const telaMaterial = getMaterial('Tela')
    const rodinhaMaterial = getMaterial('Rodinha')
    const bateFechaMaterial = getMaterial('Bate-fecha / bico de papagaio')

    const barrasTubo30 = regra.barras30.length
    const barrasTubo20 = regra.barras20.length
    const custos = {
      custoTubo30: tubo30Material ? barrasTubo30 * Number(tubo30Material.preco) : 0,
      custoTubo20: tubo20Material ? barrasTubo20 * Number(tubo20Material.preco) : 0,
      custoTrilho: trilhoMaterial ? regra.trilho * Number(trilhoMaterial.preco) : 0,
      custoTela: telaMaterial ? regra.telaArea * Number(telaMaterial.preco) : 0,
      custoRodinhas: rodinhaMaterial ? regra.rodinhas * Number(rodinhaMaterial.preco) : 0,
      custoBateFecha: bateFechaMaterial ? regra.bateFecha * Number(bateFechaMaterial.preco) : 0,
    }

    const faltantes = quote.tipoServico === 'portao_social'
      ? [['Tubo 30x30', tubo30Material], ['Tubo 20x30', tubo20Material], ['Bate-fecha / bico de papagaio', bateFechaMaterial]]
      : [['Tubo 30x30', tubo30Material], ['Tubo 20x30', tubo20Material], ['Trilho', trilhoMaterial], ['Tela', telaMaterial], ['Rodinha', rodinhaMaterial], ['Bate-fecha / bico de papagaio', bateFechaMaterial]]

    const nomesFaltantes = faltantes.filter(([, material]) => !material || Number(material.preco) <= 0).map(([nome]) => nome)
    const custoMaterial = Object.values(custos).reduce((a, b) => a + b, 0)
    const precoFinal = custoMaterial * multiplicador
    const lucro = precoFinal - custoMaterial

    setResultado({
      tipo: regra.tipo,
      ...base,
      tubo30x30: regra.tubo30x30,
      tubo20x30: regra.tubo20x30,
      trilho: regra.trilho,
      telaArea: regra.telaArea,
      rodinhas: regra.rodinhas,
      bateFecha: regra.bateFecha,
      barrasTubo30,
      barrasTubo20,
      barras30: regra.barras30,
      barras20: regra.barras20,
      ...custos,
      custoMaterial,
      lucro,
      precoFinal,
      faltantes: nomesFaltantes,
    })
  }

  const garantirCliente = async (nome, telefone) => {
    if (!nome.trim()) return
    const existente = clientes.find((item) => normalize(item.nome) === normalize(nome))
    if (existente) {
      if (telefone && existente.telefone !== telefone) {
        const { data, error } = await supabase.from('clientes').update({ telefone: telefone.trim() }).eq('id', existente.id).select().single()
        if (!error) setClientes((atual) => atual.map((item) => item.id === data.id ? data : item))
      }
      return
    }
    const { data, error } = await supabase.from('clientes').insert({ nome: nome.trim(), telefone: telefone.trim() }).select().single()
    if (!error && data) setClientes((atual) => [data, ...atual])
  }

  const salvarOrcamento = async () => {
    if (!resultado) return alert('Calcule o orçamento primeiro.')
    if (!quote.cliente.trim()) return alert('Informe o nome do cliente.')
    if (resultado.faltantes?.length) return alert(`Cadastre o preço destes materiais antes de salvar: ${resultado.faltantes.join(', ')}`)
    setSalvandoOrcamento(true)
    const payload = {
      cliente_nome: quote.cliente.trim(), telefone: quote.telefone.trim(), tipo_servico: quote.tipoServico,
      quantidade: Number(quote.quantidade) || 1, largura: Number(String(quote.largura).replace(',', '.')), altura: Number(String(quote.altura).replace(',', '.')),
      observacoes: quote.observacoes.trim(), area: resultado.area, custo_material: resultado.custoMaterial || 0,
      detalhes_materiais: resultado, status: 'aberto', custo_mao_obra: 0,
      margem_percentual: resultado.multiplicador || 2.2, multiplicador: resultado.multiplicador || 2.2, preco_final: resultado.precoFinal || 0,
    }
    const { data, error } = await supabase.from('orcamentos').insert(payload).select().single()
    if (error) { alert(`Erro ao salvar orçamento: ${error.message}`); setSalvandoOrcamento(false); return }
    setOrcamentos((atual) => [data, ...atual]); await garantirCliente(quote.cliente, quote.telefone)
    setSalvandoOrcamento(false); avisar('Orçamento salvo com sucesso!')
  }

  const limparOrcamento = () => { setQuote(emptyQuote); setResultado(null) }
  const iniciarNovo = () => { limparOrcamento(); setPagina('orcamento') }

  const adicionarMaterial = async () => {
    if (!novoMaterialNome.trim() || novoMaterialPreco === '') return alert('Preencha o nome e o preço.')
    const { data, error } = await supabase.from('materiais').insert({ nome: novoMaterialNome.trim(), unidade: novoMaterialUnidade, preco: Number(String(novoMaterialPreco).replace(',', '.')) }).select().single()
    if (error) return alert(`Erro ao cadastrar material: ${error.message}`)
    setMateriais((atual) => [...atual, data]); setNovoMaterialNome(''); setNovoMaterialUnidade('barra 6m'); setNovoMaterialPreco(''); setMostrarNovoMaterial(false); avisar('Material cadastrado.')
  }
  const excluirMaterial = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este material?')) return
    const { error } = await supabase.from('materiais').delete().eq('id', id)
    if (error) return alert(`Erro ao excluir material: ${error.message}`)
    setMateriais((atual) => atual.filter((item) => item.id !== id)); avisar('Material excluído.')
  }
  const abrirEdicaoMaterial = (material) => { setMaterialEditando(material); setEditMaterialNome(material.nome); setEditMaterialUnidade(material.unidade); setEditMaterialPreco(material.preco) }
  const salvarEdicaoMaterial = async () => {
    if (!editMaterialNome.trim() || editMaterialPreco === '') return alert('Preencha o nome e o preço.')
    const { data, error } = await supabase.from('materiais').update({ nome: editMaterialNome.trim(), unidade: editMaterialUnidade, preco: Number(String(editMaterialPreco).replace(',', '.')) }).eq('id', materialEditando.id).select().single()
    if (error) return alert(`Erro ao atualizar material: ${error.message}`)
    setMateriais((atual) => atual.map((item) => item.id === data.id ? data : item)); setMaterialEditando(null); avisar('Material atualizado.')
  }

  const adicionarCliente = async () => {
    if (!novoClienteNome.trim()) return alert('Informe o nome.')
    const { data, error } = await supabase.from('clientes').insert({ nome: novoClienteNome.trim(), telefone: novoClienteTelefone.trim() }).select().single()
    if (error) return alert(`Erro ao cadastrar cliente: ${error.message}`)
    setClientes((atual) => [data, ...atual]); setNovoClienteNome(''); setNovoClienteTelefone(''); setMostrarNovoCliente(false); avisar('Cliente cadastrado.')
  }
  const excluirCliente = async (id) => {
    if (!window.confirm('Excluir este cliente? Os orçamentos já salvos serão mantidos.')) return
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) return alert(`Erro ao excluir cliente: ${error.message}`)
    setClientes((atual) => atual.filter((item) => item.id !== id)); avisar('Cliente excluído.')
  }
  const abrirEdicaoCliente = (cliente) => { setClienteEditando(cliente); setNovoClienteNome(cliente.nome); setNovoClienteTelefone(cliente.telefone || '') }
  const salvarEdicaoCliente = async () => {
    if (!novoClienteNome.trim()) return alert('Informe o nome.')
    const { data, error } = await supabase.from('clientes').update({ nome: novoClienteNome.trim(), telefone: novoClienteTelefone.trim() }).eq('id', clienteEditando.id).select().single()
    if (error) return alert(`Erro ao atualizar cliente: ${error.message}`)
    setClientes((atual) => atual.map((item) => item.id === data.id ? data : item)); setClienteEditando(null); avisar('Cliente atualizado.')
  }
  const selecionarCliente = (cliente) => { setQuote((q) => ({ ...q, cliente: cliente.nome, telefone: cliente.telefone || '' })); setPagina('orcamento'); avisar('Cliente carregado no orçamento.') }

  const atualizarStatus = async (id, status) => {
    const { data, error } = await supabase.from('orcamentos').update({ status }).eq('id', id).select().single()
    if (error) return alert(`Erro ao atualizar status: ${error.message}`)
    setOrcamentos((atual) => atual.map((item) => item.id === id ? data : item)); setOrcamentoSelecionado(data); avisar('Status atualizado.')
  }
  const excluirOrcamento = async (id) => {
    if (!window.confirm('Excluir este orçamento?')) return
    const { error } = await supabase.from('orcamentos').delete().eq('id', id)
    if (error) return alert(`Erro ao excluir orçamento: ${error.message}`)
    setOrcamentos((atual) => atual.filter((item) => item.id !== id)); setOrcamentoSelecionado(null); avisar('Orçamento excluído.')
  }
  const gerarMensagemWhatsApp = (orcamento) => {
    const texto = `Olá! Segue o orçamento da JA Artefatos em Ferro e Alumínio.%0A%0ACliente: ${orcamento.cliente_nome}%0AServiço: ${serviceLabel(orcamento.tipo_servico)}%0AMedidas: ${number(orcamento.largura)} x ${number(orcamento.altura)} m%0AQuantidade: ${orcamento.quantidade}%0AValor: ${money(orcamento.preco_final)}%0A%0AValidade e condições a combinar.`
    const telefone = phoneDigits(orcamento.telefone)
    window.open(`https://wa.me/${telefone ? (telefone.startsWith('55') ? telefone : `55${telefone}`) : ''}?text=${texto}`, '_blank')
  }
  const imprimirOrcamento = (orcamento) => { setOrcamentoSelecionado(orcamento); window.setTimeout(() => window.print(), 100) }
  const sair = async () => { await supabase.auth.signOut() }

  const orcamentosFiltrados = useMemo(() => {
    const termo = normalize(filtroOrcamentos)
    return orcamentos.filter((o) => (statusFiltro === 'todos' || o.status === statusFiltro) && (!termo || normalize(`${o.cliente_nome} ${o.telefone} ${serviceLabel(o.tipo_servico)}`).includes(termo)))
  }, [orcamentos, filtroOrcamentos, statusFiltro])
  const clientesFiltrados = useMemo(() => clientes.filter((c) => normalize(`${c.nome} ${c.telefone}`).includes(normalize(filtroClientes))), [clientes, filtroClientes])
  const materiaisFiltrados = useMemo(() => materiais.filter((m) => normalize(`${m.nome} ${m.unidade}`).includes(normalize(filtroMateriais))), [materiais, filtroMateriais])
  const stats = useMemo(() => {
    const total = orcamentos.length
    const aprovados = orcamentos.filter((o) => o.status === 'aprovado' || o.status === 'concluido')
    const valorProposto = orcamentos.reduce((s, o) => s + Number(o.preco_final || 0), 0)
    const valorAprovado = aprovados.reduce((s, o) => s + Number(o.preco_final || 0), 0)
    return { total, aprovados: aprovados.length, valorProposto, valorAprovado, taxa: total ? Math.round((aprovados.length / total) * 100) : 0 }
  }, [orcamentos])
  const servicosRanking = useMemo(() => SERVICE_OPTIONS.map((s) => ({ ...s, total: orcamentos.filter((o) => o.tipo_servico === s.value).length })).filter((s) => s.total).sort((a, b) => b.total - a.total), [orcamentos])

  const renderDashboard = () => <div className="page">
    <header className="topbar"><div><p className="eyebrow">VISÃO GERAL</p><h1>Dashboard</h1><p>Acompanhe os orçamentos e os resultados da JA.</p></div><button className="primary-button" onClick={iniciarNovo}>+ Novo Orçamento</button></header>
    <section className="cards">
      <StatCard label="Orçamentos" value={stats.total} hint="Total salvo" icon="📋" />
      <StatCard label="Aprovados" value={stats.aprovados} hint={`${stats.taxa}% de aprovação`} icon="✓" />
      <StatCard label="Valor proposto" value={money(stats.valorProposto)} hint="Todos os orçamentos" icon="R$" />
      <StatCard label="Valor aprovado" value={money(stats.valorAprovado)} hint="Aprovados + concluídos" icon="💰" />
    </section>
    <div className="dashboard-grid">
      <section className="recent"><div className="section-header"><div><h2>Últimos orçamentos</h2><p>Os trabalhos mais recentes.</p></div><button className="link-button" onClick={() => setPagina('orcamentos')}>Ver todos →</button></div><div className="recent-list">{orcamentos.slice(0, 6).map((o) => <button className="recent-row" key={o.id} onClick={() => setOrcamentoSelecionado(o)}><div><strong>{o.cliente_nome}</strong><span>{serviceLabel(o.tipo_servico)} · {dateBR(o.created_at)}</span></div><div className="recent-value"><strong>{money(o.preco_final)}</strong><StatusBadge status={o.status} /></div></button>)}{!orcamentos.length && <EmptyState icon="📋" title="Ainda não há orçamentos" text="Crie seu primeiro orçamento." action="+ Novo orçamento" onAction={iniciarNovo} />}</div></section>
      <section className="quick-card"><h2>Serviços mais orçados</h2><p>Distribuição do histórico.</p><div className="ranking">{servicosRanking.length ? servicosRanking.map((s) => <div className="ranking-row" key={s.value}><span>{s.label}</span><strong>{s.total}</strong></div>) : <p className="muted">Ainda não há dados.</p>}</div><div className="dashboard-highlight"><span>Taxa de aprovação</span><strong>{stats.taxa}%</strong><small>{stats.aprovados} de {stats.total} orçamento(s)</small></div></section>
    </div>
  </div>

  const renderOrcamento = () => <div className="page">
    <header className="topbar"><div><p className="eyebrow">NOVO ORÇAMENTO</p><h1>Montar orçamento</h1><p>Calcule os materiais e o preço final com o multiplicador da JA.</p></div></header>
    <section className="form-card"><div className="section-title"><div><h2>Dados do serviço</h2><p>Preencha as medidas e escolha o cliente.</p></div></div>
      <div className="form-grid"><Field label="Cliente" required><input list="clientes-list" value={quote.cliente} onChange={(e) => setQuote({ ...quote, cliente: e.target.value })} placeholder="Nome do cliente" /><datalist id="clientes-list">{clientes.map((c) => <option key={c.id} value={c.nome} />)}</datalist></Field><Field label="Telefone"><input value={quote.telefone} onChange={(e) => setQuote({ ...quote, telefone: e.target.value })} placeholder="(00) 00000-0000" /></Field></div>
      <div className="form-grid three"><Field label="Tipo de serviço"><select value={quote.tipoServico} onChange={(e) => { setQuote({ ...quote, tipoServico: e.target.value }); setResultado(null) }}>{SERVICE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></Field><Field label="Quantidade"><input type="number" min="1" step="1" value={quote.quantidade} onChange={(e) => setQuote({ ...quote, quantidade: e.target.value })} /></Field><Field label="Multiplicador"><input type="number" min="0" step="0.1" value={quote.multiplicador} onChange={(e) => setQuote({ ...quote, multiplicador: e.target.value })} /><small className="field-help">Preço final = materiais × multiplicador. Padrão: 2,2×.</small></Field></div>
      <div className="form-grid"><Field label="Largura (m)" required><input inputMode="decimal" value={quote.largura} onChange={(e) => setQuote({ ...quote, largura: e.target.value })} placeholder="Ex.: 3,00" /></Field><Field label="Altura (m)" required><input inputMode="decimal" value={quote.altura} onChange={(e) => setQuote({ ...quote, altura: e.target.value })} placeholder="Ex.: 2,20" /></Field></div>
      <Field label="Observações"><textarea rows="3" value={quote.observacoes} onChange={(e) => setQuote({ ...quote, observacoes: e.target.value })} placeholder="Cor, acabamento, instalação, prazo..." /></Field>
      <div className="form-actions"><button className="secondary-button" onClick={limparOrcamento}>Limpar</button><button className="primary-button" onClick={calcularOrcamento}>🧮 Calcular orçamento</button></div>
    </section>
    {resultado && resultado.tipo === 'sem-regra' && <section className="result-card"><div className="notice">⚠️ A regra de materiais para <strong>{serviceLabel(quote.tipoServico)}</strong> ainda não foi configurada. Por enquanto o sistema mostra apenas área e perímetro.</div></section>}
    {(resultado?.tipo === 'portao' || resultado?.tipo === 'portao_social') && <Resultado resultado={resultado} onSave={salvarOrcamento} saving={salvandoOrcamento} onPrint={() => setOrcamentoSelecionado({ ...resultado, cliente_nome: quote.cliente || 'Orçamento', telefone: quote.telefone, tipo_servico: quote.tipoServico, quantidade: quote.quantidade, largura: quote.largura, altura: quote.altura, observacoes: quote.observacoes, custo_material: resultado.custoMaterial, preco_final: resultado.precoFinal, detalhes_materiais: resultado, status: 'aberto', id: 'novo' })} />}
  </div>

  const renderMateriais = () => <div className="page"><header className="topbar"><div><p className="eyebrow">CADASTRO</p><h1>Materiais</h1><p>Preços usados automaticamente nos cálculos.</p></div><button className="primary-button" onClick={() => setMostrarNovoMaterial(true)}>+ Novo Material</button></header><section className="table-card"><div className="table-tools"><div className="search-box">🔎<input value={filtroMateriais} onChange={(e) => setFiltroMateriais(e.target.value)} placeholder="Pesquisar material..." /></div><span>{materiais.length} material(is)</span></div><div className="table-header material-columns"><span>Material</span><span>Unidade</span><span>Preço</span><span>Ações</span></div>{materiaisFiltrados.map((m) => <div className="table-row material-columns" key={m.id}><strong>{m.nome}</strong><span>{m.unidade}</span><strong>{money(m.preco)}</strong><div className="row-actions"><button className="icon-button edit" title="Editar" onClick={() => abrirEdicaoMaterial(m)}>✏️</button><button className="icon-button delete" title="Excluir" onClick={() => excluirMaterial(m.id)}>🗑️</button></div></div>)}{!materiaisFiltrados.length && <EmptyState icon="📦" title="Nenhum material encontrado" text="Cadastre um material ou altere a pesquisa." />}</section>{(mostrarNovoMaterial || materialEditando) && <MaterialModal title={materialEditando ? 'Editar Material' : 'Novo Material'} subtitle="Cadastre o nome, unidade de compra e preço atual." nome={materialEditando ? editMaterialNome : novoMaterialNome} setNome={materialEditando ? setEditMaterialNome : setNovoMaterialNome} unidade={materialEditando ? editMaterialUnidade : novoMaterialUnidade} setUnidade={materialEditando ? setEditMaterialUnidade : setNovoMaterialUnidade} preco={materialEditando ? editMaterialPreco : novoMaterialPreco} setPreco={materialEditando ? setEditMaterialPreco : setNovoMaterialPreco} onClose={() => { setMostrarNovoMaterial(false); setMaterialEditando(null) }} onSave={materialEditando ? salvarEdicaoMaterial : adicionarMaterial} saveText={materialEditando ? 'Salvar Alterações' : 'Cadastrar Material'} />}</div>

  const renderClientes = () => <div className="page"><header className="topbar"><div><p className="eyebrow">CADASTRO</p><h1>Clientes</h1><p>Cadastre clientes e consulte todo o histórico de orçamentos.</p></div><button className="primary-button" onClick={() => setMostrarNovoCliente(true)}>+ Novo Cliente</button></header><section className="table-card"><div className="table-tools"><div className="search-box">🔎<input value={filtroClientes} onChange={(e) => setFiltroClientes(e.target.value)} placeholder="Pesquisar cliente ou telefone..." /></div><span>{clientes.length} cliente(s)</span></div><div className="table-header client-columns"><span>Cliente</span><span>Telefone</span><span>Ações</span></div>{clientesFiltrados.map((c) => <div className="table-row client-columns" key={c.id}><strong>{c.nome}</strong><span>{c.telefone || '—'}</span><div className="row-actions"><button className="small-button" onClick={() => selecionarCliente(c)}>Usar no orçamento</button><button className="small-button" onClick={() => setClienteHistorico(c)}>Histórico</button><button className="icon-button edit" title="Editar" onClick={() => abrirEdicaoCliente(c)}>✏️</button><button className="icon-button delete" title="Excluir" onClick={() => excluirCliente(c.id)}>🗑️</button></div></div>)}{!clientesFiltrados.length && <EmptyState icon="👥" title="Nenhum cliente encontrado" text="Cadastre seu primeiro cliente." />}</section>{(mostrarNovoCliente || clienteEditando) && <ClienteModal editando={Boolean(clienteEditando)} nome={novoClienteNome} telefone={novoClienteTelefone} setNome={setNovoClienteNome} setTelefone={setNovoClienteTelefone} onClose={() => { setMostrarNovoCliente(false); setClienteEditando(null) }} onSave={clienteEditando ? salvarEdicaoCliente : adicionarCliente} />}{clienteHistorico && <HistoricoModal cliente={clienteHistorico} orcamentos={orcamentos.filter((o) => normalize(o.cliente_nome) === normalize(clienteHistorico.nome))} onClose={() => setClienteHistorico(null)} onOpen={(o) => { setClienteHistorico(null); setOrcamentoSelecionado(o) }} />}</div>

  const renderOrcamentos = () => <div className="page"><header className="topbar"><div><p className="eyebrow">HISTÓRICO</p><h1>Orçamentos</h1><p>Pesquise, acompanhe e gerencie os orçamentos salvos.</p></div><button className="primary-button" onClick={iniciarNovo}>+ Novo Orçamento</button></header><section className="table-card"><div className="table-tools quote-tools"><div className="search-box">🔎<input value={filtroOrcamentos} onChange={(e) => setFiltroOrcamentos(e.target.value)} placeholder="Pesquisar por cliente, telefone ou serviço..." /></div><select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}><option value="todos">Todos os status</option>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div><div className="table-header quote-columns"><span>Cliente</span><span>Serviço</span><span>Medidas</span><span>Valor</span><span>Status</span><span>Ações</span></div>{orcamentosFiltrados.length ? orcamentosFiltrados.map((o) => <div className="table-row quote-columns" key={o.id}><div><strong>{o.cliente_nome}</strong><small>{dateBR(o.created_at)}</small></div><span>{serviceLabel(o.tipo_servico)}</span><span>{number(o.largura)} × {number(o.altura)} m</span><strong>{money(o.preco_final)}</strong><StatusBadge status={o.status} /><div className="row-actions"><button className="small-button" onClick={() => setOrcamentoSelecionado(o)}>Abrir</button></div></div>) : <EmptyState icon="📋" title="Nenhum orçamento encontrado" text="Altere os filtros ou crie um novo orçamento." action="+ Novo orçamento" onAction={iniciarNovo} />}</section></div>

  if (authLoading) return <div className="auth-screen"><div className="auth-card"><div className="logo-mark">JA</div><h1>JA Artefatos</h1><p>Carregando sistema...</p></div></div>
  if (!sessao) return <Login />
  const renderPagina = () => ({ dashboard: renderDashboard, orcamento: renderOrcamento, materiais: renderMateriais, clientes: renderClientes, orcamentos: renderOrcamentos }[pagina] || renderDashboard)()
  return <div className="app"><aside className="sidebar"><div className="logo"><div className="logo-mark">JA</div><div><strong>JA</strong><span>Artefatos</span></div></div><nav><button className={`menu-item ${pagina === 'dashboard' ? 'active' : ''}`} onClick={() => setPagina('dashboard')}>🏠 <span>Dashboard</span></button><button className={`menu-item ${pagina === 'orcamento' ? 'active' : ''}`} onClick={() => setPagina('orcamento')}>📝 <span>Novo Orçamento</span></button><button className={`menu-item ${pagina === 'materiais' ? 'active' : ''}`} onClick={() => setPagina('materiais')}>📦 <span>Materiais</span></button><button className={`menu-item ${pagina === 'clientes' ? 'active' : ''}`} onClick={() => setPagina('clientes')}>👥 <span>Clientes</span></button><button className={`menu-item ${pagina === 'orcamentos' ? 'active' : ''}`} onClick={() => setPagina('orcamentos')}>📋 <span>Orçamentos</span></button></nav><div className="sidebar-footer"><strong>JA Artefatos</strong><span>Ferro e Alumínio</span><small>{sessao.user?.email}</small><button className="logout-button" onClick={sair}>Sair</button></div></aside><main className="main">{erro && <div className="error-banner">⚠️ {erro} <button onClick={carregarDados}>Tentar novamente</button></div>}{carregando && <div className="loading-bar">Carregando dados...</div>}{renderPagina()}</main>{toast && <div className="toast">✓ {toast}</div>}{orcamentoSelecionado && <QuoteModal orcamento={orcamentoSelecionado} onClose={() => setOrcamentoSelecionado(null)} onStatus={atualizarStatus} onDelete={excluirOrcamento} onWhatsApp={gerarMensagemWhatsApp} onPrint={imprimirOrcamento} />}</div>
}

function Login() {
  const [email, setEmail] = useState(''); const [senha, setSenha] = useState(''); const [erro, setErro] = useState(''); const [carregando, setCarregando] = useState(false)
  const entrar = async (e) => { e.preventDefault(); setErro(''); setCarregando(true); const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha }); if (error) setErro(error.message.includes('Invalid login credentials') ? 'E-mail ou senha incorretos.' : error.message); setCarregando(false) }
  return <div className="auth-screen"><div className="auth-card"><div className="auth-brand"><div className="logo-mark">JA</div><div><strong>JA Artefatos</strong><span>Ferro e Alumínio</span></div></div><h1>Acessar sistema</h1><p>Entre com seu usuário para acessar os orçamentos.</p><form onSubmit={entrar}><Field label="E-mail" required><input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" /></Field><Field label="Senha" required><input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" /></Field>{erro && <div className="auth-error">⚠️ {erro}</div>}<button className="primary-button auth-submit" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button></form><small className="auth-note">O primeiro usuário deve ser criado no painel Authentication do Supabase.</small></div></div>
}

function Field({ label, required, children }) { return <div className="form-group"><label>{label}{required && <em> *</em>}</label>{children}</div> }
function StatCard({ label, value, hint, icon }) { return <div className="card"><div className="card-top"><span>{label}</span><b>{icon}</b></div><strong>{value}</strong><small>{hint}</small></div> }
function StatusBadge({ status }) { return <span className={`status ${status || 'aberto'}`}>{STATUS_OPTIONS.find((x) => x.value === status)?.label || 'Em aberto'}</span> }
function EmptyState({ icon, title, text, action, onAction }) { return <div className="empty"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action && <button className="primary-button" onClick={onAction}>{action}</button>}</div> }

function Resultado({ resultado, onSave, saving, onPrint }) {
  const cortes = (barras, titulo) => <div className="cut-box"><h4>{titulo}</h4>{barras.map((b, i) => <div className="cut-row" key={`${titulo}-${i}`}><span>Barra {i + 1}</span><strong>{b.cortes.map((c) => number(c)).join(' + ')} m</strong><small>Sobra {number(b.sobra)} m</small></div>)}</div>
  const linhas = [['Tubo 30×30', `${number(resultado.tubo30x30)} m`, `${resultado.barrasTubo30} barra(s)`, resultado.custoTubo30], ['Tubo 20×30', `${number(resultado.tubo20x30)} m`, `${resultado.barrasTubo20} barra(s)`, resultado.custoTubo20], ...(resultado.tipo === 'portao_social' ? [] : [['Trilho', `${number(resultado.trilho)} m`, '', resultado.custoTrilho], ['Tela', `${number(resultado.telaArea)} m²`, '', resultado.custoTela], ['Rodinha', `${resultado.rodinhas} un.`, '', resultado.custoRodinhas]]), ['Bate-fecha', `${resultado.bateFecha} un.`, '', resultado.custoBateFecha]]
  return <section className="result-card"><div className="result-title"><div><p className="eyebrow">RESULTADO</p><h2>Materiais e preço</h2><p>Consumo, compra e corte otimizado.</p></div><div className="result-total-box"><span>Preço final</span><strong>{money(resultado.precoFinal)}</strong></div></div><div className="result-grid"><div><span>Área</span><strong>{number(resultado.area)} m²</strong></div><div><span>Custo dos materiais</span><strong>{money(resultado.custoMaterial)}</strong></div><div><span>Multiplicador</span><strong>{number(resultado.multiplicador)}×</strong></div></div>{resultado.faltantes?.length > 0 && <div className="notice warning">⚠️ <strong>Preço faltando:</strong> {resultado.faltantes.join(', ')}. Cadastre os preços antes de salvar.</div>}<div className="materials-result"><div className="materials-result-header"><div><h3>Lista de compra</h3><span>Quantidade que deve ser comprada.</span></div></div>{linhas.map(([n, c, p, custo]) => <div className="material-result-row" key={n}><div><strong>{n}</strong><span>{c}{p ? ` · ${p}` : ''}</span></div><strong>{money(custo)}</strong></div>)}</div><div className="cut-grid">{cortes(resultado.barras30, 'Cortes — Tubo 30×30')}{cortes(resultado.barras20, 'Cortes — Tubo 20×30')}</div><div className="price-breakdown"><div><span>Materiais</span><strong>{money(resultado.custoMaterial)}</strong></div><div><span>Multiplicador</span><strong>{number(resultado.multiplicador)}×</strong></div><div><span>Lucro bruto</span><strong>{money(resultado.lucro)}</strong></div><div><span>Preço final</span><strong>{money(resultado.precoFinal)}</strong></div></div><div className="result-footer"><div><span>Regra</span><strong>Material × {number(resultado.multiplicador)}</strong></div><div className="result-footer-actions"><button className="secondary-button" onClick={onPrint}>🖨️ PDF / Imprimir</button><button className="primary-button" onClick={onSave} disabled={saving || resultado.faltantes?.length > 0}>{saving ? 'Salvando...' : '💾 Salvar orçamento'}</button></div></div></section>
}

function MaterialModal({ title, subtitle, nome, setNome, unidade, setUnidade, preco, setPreco, onClose, onSave, saveText }) { return <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-header"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="modal-close" onClick={onClose}>×</button></div><div className="modal-body"><Field label="Nome do material" required><input autoFocus value={nome} placeholder="Ex.: Tubo 30×30" onChange={(e) => setNome(e.target.value)} /></Field><Field label="Unidade de compra"><select value={unidade} onChange={(e) => setUnidade(e.target.value)}>{UNIT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field><Field label="Preço" required><input type="number" step="0.01" min="0" value={preco} placeholder="Ex.: 75,00" onChange={(e) => setPreco(e.target.value)} /></Field></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={onSave}>{saveText}</button></div></div></div> }
function ClienteModal({ editando, nome, telefone, setNome, setTelefone, onClose, onSave }) { return <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal"><div className="modal-header"><div><h2>{editando ? 'Editar Cliente' : 'Novo Cliente'}</h2><p>{editando ? 'Altere os dados do cliente.' : 'Cadastre os dados básicos do cliente.'}</p></div><button className="modal-close" onClick={onClose}>×</button></div><div className="modal-body"><Field label="Nome" required><input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do cliente" /></Field><Field label="Telefone"><input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" /></Field></div><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={onSave}>{editando ? 'Salvar Alterações' : 'Salvar Cliente'}</button></div></div></div> }
function HistoricoModal({ cliente, orcamentos, onClose, onOpen }) { const total = orcamentos.reduce((s, o) => s + Number(o.preco_final || 0), 0); return <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal history-modal"><div className="modal-header"><div><p className="eyebrow">HISTÓRICO DO CLIENTE</p><h2>{cliente.nome}</h2><p>{cliente.telefone || 'Sem telefone'} · {orcamentos.length} orçamento(s)</p></div><button className="modal-close" onClick={onClose}>×</button></div><div className="modal-body"><div className="history-summary"><div><span>Total orçado</span><strong>{money(total)}</strong></div><div><span>Orçamentos</span><strong>{orcamentos.length}</strong></div></div>{orcamentos.length ? orcamentos.map((o) => <button className="history-item" key={o.id} onClick={() => onOpen(o)}><div><strong>#{o.id} · {serviceLabel(o.tipo_servico)}</strong><small>{dateBR(o.created_at)} · {number(o.largura)} × {number(o.altura)} m</small></div><div><strong>{money(o.preco_final)}</strong><StatusBadge status={o.status} /></div></button>) : <EmptyState icon="📋" title="Sem histórico" text="Este cliente ainda não possui orçamentos salvos." />}</div><div className="modal-actions"><button className="primary-button" onClick={onClose}>Fechar</button></div></div></div> }
function QuoteModal({ orcamento, onClose, onStatus, onDelete, onWhatsApp, onPrint }) { const detalhes = orcamento.detalhes_materiais || {}; const multiplicador = Number(orcamento.multiplicador || detalhes.multiplicador || orcamento.margem_percentual || 2.2); const linhas = (detalhes.tipo === 'portao' || detalhes.tipo === 'portao_social') ? [['Tubo 30×30', `${number(detalhes.tubo30x30)} m`, `${detalhes.barrasTubo30} barra(s)`], ['Tubo 20×30', `${number(detalhes.tubo20x30)} m`, `${detalhes.barrasTubo20} barra(s)`], ...(detalhes.tipo === 'portao_social' ? [] : [['Trilho', `${number(detalhes.trilho)} m`, ''], ['Tela', `${number(detalhes.telaArea)} m²`, ''], ['Rodinha', `${detalhes.rodinhas} un.`, '']]), ['Bate-fecha', `${detalhes.bateFecha} un.`, '']] : []; return <div className="modal-overlay quote-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><div className="modal quote-modal"><div className="modal-header"><div><p className="eyebrow">ORÇAMENTO #{orcamento.id}</p><h2>{orcamento.cliente_nome}</h2><p>{serviceLabel(orcamento.tipo_servico)} · criado em {dateBR(orcamento.created_at)}</p></div><button className="modal-close" onClick={onClose}>×</button></div><div className="modal-body quote-detail"><div className="detail-top"><div><span>Medidas</span><strong>{number(orcamento.largura)} × {number(orcamento.altura)} m</strong></div><div><span>Quantidade</span><strong>{orcamento.quantidade}</strong></div><div><span>Valor</span><strong>{money(orcamento.preco_final)}</strong></div></div><div className="detail-status"><label>Status</label><select value={orcamento.status || 'aberto'} onChange={(e) => onStatus(orcamento.id, e.target.value)}>{STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>{linhas.length > 0 && <div className="detail-materials"><h3>Materiais calculados</h3>{linhas.map(([n, c, p]) => <div key={n}><span>{n}</span><strong>{c} {p && <small>({p})</small>}</strong></div>)}</div>}<div className="detail-finance"><div><span>Materiais</span><strong>{money(orcamento.custo_material)}</strong></div><div><span>Multiplicador</span><strong>{number(multiplicador)}×</strong></div><div><span>Lucro</span><strong>{money(Number(orcamento.preco_final || 0) - Number(orcamento.custo_material || 0))}</strong></div></div>{orcamento.observacoes && <div className="detail-notes"><strong>Observações</strong><p>{orcamento.observacoes}</p></div>}</div><div className="modal-actions detail-actions"><button className="danger-text" onClick={() => onDelete(orcamento.id)}>Excluir</button><span className="actions-spacer" /><button className="secondary-button" onClick={() => onPrint(orcamento)}>🖨️ PDF / Imprimir</button><button className="secondary-button" onClick={() => onWhatsApp(orcamento)}>💬 WhatsApp</button><button className="primary-button" onClick={onClose}>Fechar</button></div></div></div> }

export default App
