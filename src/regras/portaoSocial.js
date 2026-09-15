// Regras do Portão Social
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

export const calcularPortaoSocial = ({ largura, altura, quantidade = 1 }) => {
  const alturaPorta = altura - 0.02
  const larguraPorta = largura - 0.04 - 0.06 - 0.005

  if (alturaPorta <= 0 || larguraPorta <= 0) {
    alert('As medidas informadas são pequenas demais para calcular o portão social.')
    return null
  }

  // Marco 20x30: 2 laterais + 1 travessa na largura final da porta.
  const tubo20Pecas = Array.from({ length: quantidade }, () => [altura, altura, larguraPorta]).flat()

  // Porta 30x30: 2 alturas + 2 larguras.
  const tubo30Pecas = Array.from({ length: quantidade }, () => [alturaPorta, alturaPorta, larguraPorta, larguraPorta]).flat()

  return {
    tipo: 'portao_social',
    tubo30x30: tubo30Pecas.reduce((a, b) => a + b, 0),
    tubo20x30: tubo20Pecas.reduce((a, b) => a + b, 0),
    barras30: otimizarCortes(tubo30Pecas),
    barras20: otimizarCortes(tubo20Pecas),
    trilho: 0,
    telaArea: 0,
    rodinhas: 0,
    bateFecha: quantidade,
  }
}
