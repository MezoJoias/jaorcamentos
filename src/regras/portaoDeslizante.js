// Regras do Portão Deslizante
// Medidas em metros. Barras comerciais de 6 m.

const otimizarCortes = (pecas, comprimento = 6) => {
  const ordenadas = [...pecas].filter((p) => p > 0).sort((a, b) => b - a)
  const barras = []
  ordenadas.forEach((peca) => {
    let colocada = false
    for (const barra of barras) {
      if (barra.sobra + 0.0001 >= peca) {
        barra.cortes.push(peca)
        barra.usado += peca
        barra.sobra -= peca
        colocada = true
        break
      }
    }
    if (!colocada) barras.push({ cortes: [peca], usado: peca, sobra: comprimento - peca })
  })
  return barras
}

export const calcularPortaoDeslizante = ({ largura, altura, quantidade = 1 }) => {
  if (largura - 0.06 <= 0 || altura - 0.06 <= 0) {
    alert('As medidas informadas são pequenas demais para calcular o portão de correr.')
    return null
  }

  const tubo30Pecas = Array.from({ length: quantidade }, () => [altura, altura, largura - 0.06, largura - 0.06]).flat()
  const tubo20Pecas = Array.from({ length: quantidade }, () => [altura - 0.06, altura - 0.06]).flat()

  return {
    tipo: 'portao',
    tubo30x30: tubo30Pecas.reduce((a, b) => a + b, 0),
    tubo20x30: tubo20Pecas.reduce((a, b) => a + b, 0),
    barras30: otimizarCortes(tubo30Pecas),
    barras20: otimizarCortes(tubo20Pecas),
    trilho: largura * 2 * quantidade,
    telaArea: 2.5 * largura * quantidade,
    rodinhas: 2 * quantidade,
    bateFecha: quantidade,
  }
}
