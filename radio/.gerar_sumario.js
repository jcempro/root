// radio/gerar_sumario.js
import fs from 'fs';
import path from 'path';

const dbDir = path.join('.', 'radio', 'db');
const sumarioPath = path.join('.', 'radio', 'sumario.json');

function gerarSumario() {
	// Lista todos os arquivos .json dentro de /radio/db
	const arquivos = fs
		.readdirSync(dbDir)
		.filter((f) => f.endsWith('.json'));

	const resultado = arquivos.map((arquivo) => {
		const caminho = path.join(dbDir, arquivo);
		const conteudo = JSON.parse(fs.readFileSync(caminho, 'utf-8'));
		const nome = path.basename(arquivo, '.json');
		const marca = ((x) => {
			x.charAt(0).toUpperCase() + x.slice(1).toLowerCase() || '';
		})(conteudo.mc);
		const modelo = conteudo.md || '';
		const dt = conteudo.dp || '';
		return [nome, marca, modelo, dt];
	});

	fs.writeFileSync(sumarioPath, JSON.stringify(resultado, null, 2));
	console.log(
		`✅ sumario.json atualizado com ${resultado.length} itens.`,
	);
}

gerarSumario();
