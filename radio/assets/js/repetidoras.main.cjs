const isNODE = typeof window === 'undefined';

const fs = isNODE ? require('fs') : null;
const https = isNODE ? require('https') : null;
const path = isNODE ? require('path') : null;

const __RPTDR_LNK = 'https://radioid.net/static/rptrs.json';
const REGEX_PROTOCOL = /^\s*[^:\/\\]:\/\//i;
const REGEX_LOCAL = /^(?!(?:[a-zA-Z]+:)?\/\/|[a-zA-Z]:\\|\/).*/;
const PATH_FILE = 'radio/repetidoras/rptrs.json';
const ROOT = path.resolve('../../../../');

const hasFETCH = !typeof fetch === 'undefined';

// === APENAS ESTA LINHA ADICIONADA ===
let cacheProcessado = null;

async function processarJSON() {
	try {
		async function _GET(url) {
			const is_relative =
				!REGEX_PROTOCOL.test(url) || REGEX_LOCAL.test(url);

			console.log(isNODE, '???????????', process.cwd());
			if (is_relative && isNODE) {
				let furl = !fs.existsSync(url) ? path.join(ROOT, url) : url;

				if (fs.existsSync(furl)) {
					const dados = fs.readFileSync(furl, 'utf8');
					return JSON.parse(dados);
				}
			}

			if (isNODE && is_relative) {
				return new Promise((resolve, reject) => {
					reject();
				});
			}

			if (!hasFETCH || isNODE) {
				return new Promise((resolve, reject) => {
					https
						.get(url, (resp) => {
							let data = '';
							resp.on('data', (chunk) => (data += chunk));
							resp.on('end', () => resolve(JSON.parse(data)));
						})
						.on('error', reject);
				});
			} else {
				return fetch(url);
			}
		}

		// Função para carregar JSON
		async function carregarJSON() {
			for (const value of [PATH_FILE, __RPTDR_LNK]) {
				const response = await _GET(value);
				if (!response.ok) {
					console.error(`Falha ao carregar '${value}'`);
				}
				return await response.json();
			}
		}

		// Carrega os dados
		const jsonData = await carregarJSON();

		// Verifica se a estrutura esperada existe
		if (!jsonData.rptrs || !Array.isArray(jsonData.rptrs)) {
			throw new Error(
				'Estrutura do JSON inválida. Esperado objeto com propriedade "rptrs" array.',
			);
		}

		const CSV_SEP = ',';
		const _ASPAS = (x) => (!isNaN(x) && isFinite(x) ? x : `"${x}"`);

		/* nome e ordens das colunas .csv a ser gerada a partir o json */
		const csvMODEL = {
			uv5rh: [],
			rt4d: [
				'CH', // number, autoincrement
				'RX Freq',
				'TX Freq',
				'CH Mode', //options: Digital ou Analogue
				'RX/TX Limit', //options: RX+TX, Only RX, Only TX
				'TX Power', //options: high ou low
				'TOT', // options: off, 5, 10, 15, 30, 45,60...600
				'Scan Add', //options: Add, Remove
				'CH Alias', // string seguind: 'XX: CITY', onde XX é a sigla do estado maíscula (ex: SP) CITY é o nome da Cidade
				'ID Type', //options: Radio ID, Channel ID
				'CH ID',
				'Dual Slot', //options: On/Off
				'Time Slot', //options: 1 ou 2
				'Color Code', //options: 1 à 15
				'Promiscuous', //options: On/Off - default off
				'TX Politely', // options: Allow TX, Channel Free, Color Code Idle
				'TX Contacts', // only: ALl Call
				'RX TG List', //None ou TG List-001, TG List-002, TG List-003...TG List-250
				'DMR Encryption', //None or Key 1, Key 2, Key 3 ... Key 256 - default None
				'RX CTC DCS', //None or float value
				'TX CTC DCS', // None or float value
				'CTC DCS Type', //options:Normal, Encrypt 1, Encrypt 2, Encrypt 3, Mute Code
				'Mute Code', //number value
				'Busy Lock', //options: Allown TX, Channel Free, CTC/DCS Idle
				'Demodulation', //options: FM, AM, SSB
				'Tail Tone', // Options: Off, 55Hz No Shift, 120º Shift, 180º Shift, 240º Shift
				'Scrambler', //options: off, 1,2,3...9
				'Bandwidth', //Options: Wide, Narrow
				'Offset', // float, diference entre RX Freq e TX Freq em relação a RX Freq
			],
		};

		function capitalizarTodasAsPalavras(str) {
			if (typeof str !== 'string') return str;
			str = str.toLowerCase();

			return str
				.split(' ')
				.map((word) => {
					// Aqui, 'word' já é minúsculo devido à linha anterior
					return word.charAt(0).toUpperCase() + word.slice(1);
				})
				.join(' ');
		}

		// Função para capitalizar todos os campos string de um objeto
		function capitalizarObjeto(objeto) {
			const novoObjeto = {};
			for (const [key, value] of Object.entries(objeto)) {
				if (typeof value === 'string') {
					novoObjeto[key] = capitalizarTodasAsPalavras(value);
				} else {
					novoObjeto[key] = value;
				}
			}
			return novoObjeto;
		}

		// Função para converter TS1/TS2 para números
		function converterTSLinked(ts_linked) {
			if (!ts_linked) return '';
			return ts_linked
				.replace(/TS/gi, '')
				.trim()
				.replace(/\s+/g, ' ');
		}

		// Função para garantir que campos numéricos sejam números
		function converterCamposNumericos(registro) {
			const camposNumericos = [
				'frequency',
				'offset',
				'color_code',
				'id',
			];
			const novoRegistro = { ...registro };

			camposNumericos.forEach((campo) => {
				if (
					novoRegistro[campo] !== undefined &&
					novoRegistro[campo] !== null
				) {
					novoRegistro[campo] = parseFloat(novoRegistro[campo]) || 0;
				}
			});

			return novoRegistro;
		}

		// Mapeamento de estados brasileiros (nomes e variações para siglas)
		const mapeamentoEstados = {
			// Nomes completos
			acre: 'ac',
			alagoas: 'al',
			amapa: 'ap',
			amapá: 'ap',
			amazonas: 'am',
			bahia: 'ba',
			ceara: 'ce',
			ceará: 'ce',
			'distrito federal': 'df',
			'espirito santo': 'es',
			'espírito santo': 'es',
			goias: 'go',
			goiás: 'go',
			maranhao: 'ma',
			maranhão: 'ma',
			'mato grosso': 'mt',
			'mato grosso do sul': 'ms',
			'minas gerais': 'mg',
			para: 'pa',
			pará: 'pa',
			paraiba: 'pb',
			paraíba: 'pb',
			parana: 'pr',
			paraná: 'pr',
			pernambuco: 'pe',
			piaui: 'pi',
			piauí: 'pi',
			'rio de janeiro': 'rj',
			'rio grande do norte': 'rn',
			'rio grande do sul': 'rs',
			rondonia: 'ro',
			rondônia: 'ro',
			roraima: 'rr',
			'santa catarina': 'sc',
			'sao paulo': 'sp',
			'são paulo': 'sp',
			sergipe: 'se',
			tocantins: 'to',

			// Siglas
			ac: 'ac',
			al: 'al',
			ap: 'ap',
			am: 'am',
			ba: 'ba',
			ce: 'ce',
			df: 'df',
			es: 'es',
			go: 'go',
			ma: 'ma',
			mt: 'mt',
			ms: 'ms',
			mg: 'mg',
			pa: 'pa',
			pb: 'pb',
			pr: 'pr',
			pe: 'pe',
			pi: 'pi',
			rj: 'rj',
			rn: 'rn',
			rs: 'rs',
			ro: 'ro',
			rr: 'rr',
			sc: 'sc',
			sp: 'sp',
			se: 'se',
			to: 'to',
		};

		// Função para normalizar nome do estado para sigla
		function normalizarEstado(estado) {
			if (!estado) return '';

			// Remove acentos e converte para minúsculas
			const estadoNormalizado = estado
				.toLowerCase()
				.normalize('NFD')
				.replace(/[\u0300-\u036f]/g, '')
				.trim();

			return (
				mapeamentoEstados[estadoNormalizado] || estadoNormalizado
			);
		}

		// Função para limpar o campo city (remove referências a estado e país)
		function limparCity(city, estadoSigla) {
			if (!city) return '';

			// Padrões para remover baseados no estado atual
			const padroesRemover = [
				'mg',
				'minas gerais',
				'sp',
				'sao paulo',
				'são paulo',
				'ac',
				'acre',
				'al',
				'alagoas',
				'ap',
				'amapa',
				'amapá',
				'am',
				'amazonas',
				'ba',
				'bahia',
				'ce',
				'ceara',
				'ceará',
				'df',
				'distrito federal',
				'es',
				'espirito santo',
				'espírito santo',
				'go',
				'goias',
				'goiás',
				'ma',
				'maranhao',
				'maranhão',
				'mt',
				'mato grosso',
				'ms',
				'mato grosso do sul',
				'pa',
				'para',
				'pará',
				'pb',
				'paraiba',
				'paraíba',
				'pr',
				'parana',
				'paraná',
				'pe',
				'pernambuco',
				'pi',
				'piaui',
				'piauí',
				'rj',
				'rio de janeiro',
				'rn',
				'rio grande do norte',
				'rs',
				'rio grande do sul',
				'ro',
				'rondonia',
				'rondônia',
				'rr',
				'roraima',
				'sc',
				'santa catarina',
				'se',
				'sergipe',
				'to',
				'tocantins',
				'brazil',
				'brasil',
			];

			let cityLimpa = String(city);

			// Remove referências específicas do estado atual primeiro
			if (estadoSigla) {
				const estadoAtual = Object.keys(mapeamentoEstados).find(
					(key) => mapeamentoEstados[key] === estadoSigla,
				);
				if (estadoAtual) {
					const padroesEstado = estadoAtual.split(' ');
					padroesEstado.forEach((padrao) => {
						cityLimpa = cityLimpa.replace(
							new RegExp(`\\s*[\\-,\\.\\/]\\s*${padrao}`, 'gi'),
							'',
						);
					});
				}
			}

			// Remove outros estados e país
			padroesRemover.forEach((padrao) => {
				cityLimpa = cityLimpa.replace(
					new RegExp(`\\s*[\\-,\\.\\/]\\s*${padrao}`, 'gi'),
					'',
				);
			});

			// Remove espaços extras e capitaliza
			return capitalizarTodasAsPalavras(
				cityLimpa.replace(/\s+/g, ' ').trim(),
			);
		}

		// Função para converter registro para linha CSV
		function registroParaCSV(
			registro,
			estadoSigla,
			chNumber,
			chAlias,
		) {
			const freqRX = parseFloat(registro.frequency) || 0;
			const offset = parseFloat(registro.offset) || 0;
			const freqTX = freqRX + offset;

			// Formata frequências para 8 dígitos com ponto
			function formatarFrequencia(freq) {
				return `${parseFloat(freq).toFixed(5)}`.padEnd(8, '0');
			}

			// Converte TS Linked para determinar time slot
			const tsLinked = converterTSLinked(registro.ts_linked);
			const timeSlot = tsLinked.includes('2') ? '2' : '1';

			return [
				chNumber, // CH
				_ASPAS(`${formatarFrequencia(freqRX)}`), // RX Freq (em MHz formatado)
				_ASPAS(`${formatarFrequencia(freqTX)}`), // TX Freq (em MHz formatado)
				_ASPAS('Digital'), // CH Mode
				_ASPAS('RX+TX'), // RX/TX Limit
				_ASPAS('High'), // TX Power
				_ASPAS(60), // TOT (alterado para 60)
				_ASPAS('Add'), // Scan Add
				_ASPAS(chAlias), // CH Alias (agora usando o parâmetro)
				_ASPAS('Channel ID'), // ID Type
				_ASPAS(`${registro.id || ''}`), // CH ID
				_ASPAS('Off'), // Dual Slot
				_ASPAS(timeSlot), // Time Slot (convertido de TS Linked)
				_ASPAS(`${registro.color_code || '1'}`), // Color Code
				_ASPAS('Off'), // Promiscuous
				_ASPAS('Allow TX'), // TX Politely
				_ASPAS('All Call'), // TX Contacts
				_ASPAS('None'), // RX TG List (alterado para None)
				_ASPAS('None'), // DMR Encryption
				_ASPAS('None'), // RX CTC DCS
				_ASPAS('None'), // TX CTC DCS
				_ASPAS('Normal'), // CTC DCS Type
				_ASPAS(0), // Mute Code
				_ASPAS('Allow TX'), // Busy Lock
				_ASPAS('FM'), // Demodulation
				_ASPAS('Off'), // Tail Tone
				_ASPAS('Off'), // Scrambler
				_ASPAS('Wide'), // Bandwidth
				_ASPAS(`${offset.toFixed(5)}`), // Offset
			];
		}

		// Filtra e processa os registros por estado
		const estados = {};

		for (const kk in jsonData.rptrs) {
			const registro = jsonData.rptrs[kk];
			const status = String(registro.status || '')
				.trim()
				.toLowerCase();
			const state = String(registro.state || '').trim();
			const country = String(registro.country || '')
				.trim()
				.toLowerCase();

			// Considera Brazil mesmo se o campo não existir ou estiver vazio
			const isBrazil = /bra(s|z)il/i.test(country.trim());

			if (isBrazil && status === 'active') {
				// Normaliza o estado para sigla
				const estadoSigla = normalizarEstado(state);

				if (!estadoSigla) continue;

				// Cria uma cópia do registro sem os campos desnecessários
				const {
					state: estadoRemovido,
					country: paisRemovido,
					status: statusRemovido,
					locator: locatorRemovido,
					callsign: callsignRemovido,
					map_info: map_infoRemovido,
					trustee: trusteeRemovido,
					map: mapRemovido,
					...novoRegistro
				} = registro;

				// Limpa o campo city com base no estado
				novoRegistro.city = limparCity(
					novoRegistro.city,
					estadoSigla,
				);

				// Converte campos numéricos
				const novoRegistroNumerico =
					converterCamposNumericos(novoRegistro);

				// Converte TS Linked
				if (novoRegistroNumerico.ts_linked) {
					novoRegistroNumerico.ts_linked = converterTSLinked(
						novoRegistroNumerico.ts_linked,
					);
				}

				// Capitaliza todos os campos string do registro
				const novoRegistroCapitalizado = capitalizarObjeto(
					novoRegistroNumerico,
				);

				// Adiciona ao array do estado correspondente
				if (!estados[estadoSigla]) {
					estados[estadoSigla] = [];
				}
				estados[estadoSigla].push(novoRegistroCapitalizado);
			}
		}

		// === APENAS ESTA LINHA ADICIONADA ===
		cacheProcessado = estados;

		// Processa cada estado individualmente
		const nomeBase = 'meta/' + PATH_FILE.replace('.json', '');
		let totalEstados = 0;
		let totalRegistros = 0;

		for (const [estadoSigla, registros] of Object.entries(estados)) {
			// Ordena registros por cidade
			registros.sort((a, b) => a.city.localeCompare(b.city));

			// Cria a estrutura para o estado
			const estadoJSON = { [estadoSigla]: registros };

			// Gera nomes de arquivo com o estado
			const jsonNomeArquivo = `${nomeBase}.${estadoSigla}.json`;
			const csvNomeArquivo = `${nomeBase}.${estadoSigla}.csv`;

			// Salva o arquivo JSON (apenas no Node.js)
			if (isNODE) {
				fs.writeFileSync(
					jsonNomeArquivo,
					JSON.stringify(estadoJSON, null, 2),
				);
			} else {
				// No navegador, disponibiliza para download
				const blob = new Blob([JSON.stringify(estadoJSON, null, 2)], {
					type: 'application/json',
				});
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = jsonNomeArquivo;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}

			// Prepara registros para CSV
			const todosRegistros = [];
			const contadorCidades = {};

			// Adiciona registros com estado
			registros.forEach((registro) => {
				const chave = `${estadoSigla}:${registro.city}`;
				contadorCidades[chave] = (contadorCidades[chave] || 0) + 1;
				const contador = contadorCidades[chave];

				const chAlias =
					contador > 1
						? `${estadoSigla.toUpperCase()}: ${
								registro.city
						  } [${contador}]`
						: `${estadoSigla.toUpperCase()}: ${registro.city}`;

				todosRegistros.push({
					registro,
					estado: estadoSigla,
					chAlias: chAlias,
				});
			});

			// Ordena alfabeticamente por cidade
			todosRegistros.sort((a, b) => {
				return a.registro.city.localeCompare(b.registro.city);
			});

			// Gera o CSV
			let csvContent = csvMODEL.rt4d.join(CSV_SEP) + '\n';
			let chNumber = 1;

			todosRegistros.forEach((item) => {
				const linha = registroParaCSV(
					item.registro,
					item.estado,
					chNumber++,
					item.chAlias,
				);
				csvContent += linha.join(CSV_SEP) + '\n';
			});

			// Salva o arquivo CSV (apenas no Node.js)
			if (isNODE) {
				fs.writeFileSync(csvNomeArquivo, csvContent);
			} else {
				// No navegador, disponibiliza para download
				const blob = new Blob([csvContent], { type: 'text/csv' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = csvNomeArquivo;
				document.body.appendChild(a);
				a.click();
				document.body.removeChild(a);
				URL.revokeObjectURL(url);
			}

			totalEstados++;
			totalRegistros += registros.length;

			console.log(
				`Estado ${estadoSigla.toUpperCase()}: ${
					registros.length
				} registros`,
			);
		}

		console.log(`\nArquivos processados com sucesso!`);
		console.log(`Registros originais: ${jsonData.rptrs.length}`);
		console.log(`Estados processados: ${totalEstados}`);
		console.log(`Total registros filtrados: ${totalRegistros}`);
		console.log(
			`Arquivos gerados para cada estado: ${nomeBase}.{estado}.{json,csv}`,
		);
	} catch (error) {
		console.error('Erro ao processar o arquivo:', error);
	}
}

// === APENAS ESTAS FUNÇÕES ADICIONADAS ===

// Função para download individual
function downloadIndividual(estado, formato, modeloCSV = 'rt4d') {
	if (!cacheProcessado) {
		console.error(
			'Dados não processados. Execute processarJSON() primeiro.',
		);
		return;
	}

	const estadoSigla = estado.toLowerCase();
	const registros = cacheProcessado[estadoSigla];

	if (!registros) {
		console.error(`Estado ${estado} não encontrado`);
		return;
	}

	const nomeBase = 'meta/' + PATH_FILE.replace('.json', '');

	if (formato === 'json') {
		const registrosOrdenados = [...registros].sort((a, b) =>
			a.city.localeCompare(b.city),
		);
		const estadoJSON = { [estadoSigla]: registrosOrdenados };
		const jsonNomeArquivo = `${nomeBase}.${estadoSigla}.json`;
		const conteudo = JSON.stringify(estadoJSON, null, 2);

		if (isNODE) {
			fs.writeFileSync(jsonNomeArquivo, conteudo);
			console.log(`JSON gerado: ${jsonNomeArquivo}`);
		} else {
			const blob = new Blob([conteudo], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = jsonNomeArquivo;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	} else if (formato === 'csv') {
		const modelo = csvMODEL[modeloCSV];
		if (!modelo) {
			console.error(`Modelo CSV ${modeloCSV} não encontrado`);
			return;
		}

		const CSV_SEP = ',';
		const _ASPAS = (x) => (!isNaN(x) && isFinite(x) ? x : `"${x}"`);

		const todosRegistros = [];
		const contadorCidades = {};

		registros.forEach((registro) => {
			const chave = `${estadoSigla}:${registro.city}`;
			contadorCidades[chave] = (contadorCidades[chave] || 0) + 1;
			const contador = contadorCidades[chave];

			const chAlias =
				contador > 1
					? `${estadoSigla.toUpperCase()}: ${
							registro.city
					  } [${contador}]`
					: `${estadoSigla.toUpperCase()}: ${registro.city}`;

			todosRegistros.push({
				registro,
				estado: estadoSigla,
				chAlias: chAlias,
			});
		});

		todosRegistros.sort((a, b) => {
			return a.registro.city.localeCompare(b.registro.city);
		});

		let csvContent = modelo.join(CSV_SEP) + '\n';
		let chNumber = 1;

		todosRegistros.forEach((item) => {
			const linha = registroParaCSV(
				item.registro,
				item.estado,
				chNumber++,
				item.chAlias,
			);
			csvContent += linha.join(CSV_SEP) + '\n';
		});

		const csvNomeArquivo = `${nomeBase}.${estadoSigla}.${modeloCSV}.csv`;

		if (isNODE) {
			fs.writeFileSync(csvNomeArquivo, csvContent);
			console.log(`CSV gerado: ${csvNomeArquivo}`);
		} else {
			const blob = new Blob([csvContent], { type: 'text/csv' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = csvNomeArquivo;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		}
	}
}

// Interface para navegador
function criarInterfaceNavegador() {
	if (isNODE) return;

	const container = document.createElement('div');
	container.style.cssText =
		'position: fixed; top: 10px; right: 10px; background: white; border: 1px solid #ccc; padding: 10px; z-index: 1000; max-height: 80vh; overflow-y: auto;';

	const titulo = document.createElement('h3');
	titulo.textContent = 'Downloads Repetidoras';
	container.appendChild(titulo);

	const btnProcessar = document.createElement('button');
	btnProcessar.textContent = 'Carregar Dados';
	btnProcessar.onclick = async () => {
		btnProcessar.disabled = true;
		btnProcessar.textContent = 'Carregando...';

		try {
			await processarJSON();

			btnProcessar.remove();

			const estados = Object.keys(cacheProcessado);
			const modelos = Object.keys(csvMODEL);

			estados.forEach((estado) => {
				const estadoSection = document.createElement('div');
				estadoSection.style.marginBottom = '10px';

				const estadoTitulo = document.createElement('h4');
				estadoTitulo.textContent = `Estado: ${estado.toUpperCase()} (${
					cacheProcessado[estado].length
				} registros)`;
				estadoSection.appendChild(estadoTitulo);

				const linkJSON = document.createElement('a');
				linkJSON.textContent = '📁 JSON';
				linkJSON.href = '#';
				linkJSON.style.marginRight = '10px';
				linkJSON.style.cursor = 'pointer';
				linkJSON.onclick = () => downloadIndividual(estado, 'json');
				estadoSection.appendChild(linkJSON);

				modelos.forEach((modelo) => {
					const linkCSV = document.createElement('a');
					linkCSV.textContent = `📊 CSV ${modelo}`;
					linkCSV.href = '#';
					linkCSV.style.marginRight = '10px';
					linkCSV.style.cursor = 'pointer';
					linkCSV.onclick = () =>
						downloadIndividual(estado, 'csv', modelo);
					estadoSection.appendChild(linkCSV);
				});

				container.appendChild(estadoSection);
			});
		} catch (error) {
			console.error('Erro ao carregar dados:', error);
			btnProcessar.textContent =
				'Erro - Clique para tentar novamente';
			btnProcessar.disabled = false;
		}
	};
	container.appendChild(btnProcessar);

	document.body.appendChild(container);
}

if (!isNODE) {
	window.downloadIndividual = downloadIndividual;
	window.processarJSON = processarJSON;

	if (document.readyState === 'loading') {
		document.addEventListener(
			'DOMContentLoaded',
			criarInterfaceNavegador,
		);
	} else {
		criarInterfaceNavegador();
	}
} else {
	processarJSON();
}
