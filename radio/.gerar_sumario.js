// radio/gerar_sumario.js
import fs from 'fs';
import path from 'path';

const dbDir = path.join('.', 'radio', 'db');
const sumarioBase = path.join('.', 'radio', 'sumario'); // base: sumario-0.json, sumario-1.json etc.

function gerarSumario() {
	// Lista todos os arquivos .json dentro de /radio/db
	const arquivos = fs
		.readdirSync(dbDir)
		.filter((f) => f.endsWith('.json'));

	const resultado = arquivos.map((arquivo) => {
		const caminho = path.join(dbDir, arquivo);
		const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
		const nome = path.basename(arquivo, '.json');
		const marca = conteudo.mc
			? conteudo.mc.charAt(0).toUpperCase() +
			  conteudo.mc.slice(1).toLowerCase()
			: '';
		const modelo = conteudo.md || '';
		const dt = conteudo.dp || '';
		return [nome, marca, modelo, dt];
	});

	// Paginação: 25 itens por página
	const porPagina = 25;
	const totalPaginas = Math.ceil(resultado.length / porPagina);

	for (let i = 0; i < totalPaginas; i++) {
		const inicio = i * porPagina;
		const fim = inicio + porPagina;
		const pagina = resultado.slice(inicio, fim);

		// Se existir próxima página, adiciona o número dela como última linha
		if (i < totalPaginas - 1) {
			pagina.push(i + 1);
		}

		const nomeArquivo = `${sumarioBase}-${i}.json`;
		fs.writeFileSync(nomeArquivo, JSON.stringify(pagina, null, 2));
	}

	console.log(
		`✅ ${totalPaginas} arquivos de sumário gerados, totalizando ${resultado.length} itens.`,
	);
}

gerarSumario();
