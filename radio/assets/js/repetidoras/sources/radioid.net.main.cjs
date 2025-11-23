/**
 * Detecta ambiente Node.js vs Browser
 * @type {boolean}
 */
const isNODE = typeof window === 'undefined';

/**
 * Importa módulo de validação de cidades
 */
const CIDADES = isNODE
	? require('../cidades.main.cjs')
	: typeof window !== 'undefined'
	? window.cidades
	: globalThis.cidades;

/**
 * URL de dados da rede Radio ID
 * @type {string}
 */
const __RPTDR_LNK = 'https://radioid.net/static/rptrs.json';

/**
 * Caminho local para armazenamento de dados
 * @type {string}
 */
const PATH_FILE = 'rptrs.json';

/**
 * Mapeamento de estados brasileiros (nomes completos e abreviações)
 * @type {Object}
 */
const estadosMap = {
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
	// Abreviações
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

/**
 * Cache para dados processados
 * @type {Object|null}
 */
let cacheProcessado = null;

/**
 * Normaliza nomes de estados para abreviações padrão
 * @param {string} estado - Nome ou abreviação do estado
 * @returns {string} Sigla normalizada
 */
const normalizarEstado = (estado) =>
	estado
		? estadosMap[
				estado
					.toLowerCase()
					.normalize('NFD') // Remove acentos
					.replace(/[\u0300-\u036f]/g, '')
					.trim()
		  ] || ''
		: '';

/**
 * Converte string de timeslot para array numérico
 * @param {string} ts_linked - Ex.: "TS1 TS2"
 * @returns {number[]} Array de timeslots
 */
const converterTimeslot = (ts_linked) => {
	if (!ts_linked) return [];
	return ts_linked
		.replace(/TS/gi, '')
		.trim()
		.split(/\s+/)
		.map((num) => parseInt(num, 10))
		.filter((num) => !isNaN(num) && num > 0);
};

/**
 * Limpa e valida nomes de cidades
 * @param {string} city - Nome cru da cidade
 * @param {string} estadoSigla - Sigla do estado
 * @returns {Promise<string>} Nome processado e validado
 */
const processarNomeCidade = async (city, estadoSigla) => {
	if (!city) return '';
	let cityLimpa = String(city);

	// Remove nomes de estados ou países no final
	const padroesRemover = Object.keys(estadosMap).concat([
		'brazil',
		'brasil',
	]);

	if (estadoSigla) {
		const estadoAtual = Object.keys(estadosMap).find(
			(key) => estadosMap[key] === estadoSigla,
		);
		if (estadoAtual) {
			const padroesEstado = estadoAtual.split(' ');
			padroesEstado.forEach((padrao) => {
				cityLimpa = cityLimpa.replace(
					new RegExp(
						`[\\-\\s\\/\\,\\.]+${padrao}[\\-\\s\\/\\,\\.]*$`,
						'gi',
					),
					'',
				);
			});
		}
	}

	padroesRemover.forEach((padrao) => {
		cityLimpa = cityLimpa.replace(
			new RegExp(
				`[\\-\\s\\/\\,\\.]+${padrao}[\\-\\s\\/\\,\\.]*$`,
				'gi',
			),
			'',
		);
	});

	// Limpeza de símbolos no início/fim e substituição interna
	cityLimpa = cityLimpa
		.replace(/[\\-\\.\\/,\\|\\s]+$/, '')
		.replace(/^[\\-\\.\\/,\\|\\s]+/, '')
		.replace(/[\\-\\.\\/,\\|]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	// Valida usando base oficial
	if (cityLimpa && cityLimpa.length > 1) {
		return await CIDADES.validarNomeCidade(cityLimpa);
	}

	// Fallback
	return commom.capitalizar(
		city
			.replace(/[\\-\\.\\/,\\|]+/g, ' ')
			.replace(/\s+/g, ' ')
			.trim(),
	);
};

/**
 * Processa registro individual de repetidor
 * @param {Object} registro - Dados crus
 * @param {Object} contadorCidades - Contador para lidar com duplicatas
 * @returns {Promise<Object|null>} Registro processado ou null se inválido
 */
async function processarRegistro(registro, contadorCidades) {
	const { state, country, status, city, ...novoReg } = registro;

	// Apenas repetidores ativos no Brasil
	if (
		!/bra(s|z)il/i.test((country || '').trim()) ||
		(status || '').toLowerCase() !== 'active'
	)
		return null;

	const estadoSigla = normalizarEstado(state);
	if (!estadoSigla) return null;

	const cidadeProcessada = await processarNomeCidade(
		city,
		estadoSigla,
	);
	if (!cidadeProcessada) return null;

	// Converte campos numéricos
	['frequency', 'offset', 'color_code', 'id'].forEach((c) => {
		if (novoReg[c] != null) novoReg[c] = parseFloat(novoReg[c]) || 0;
	});

	novoReg.info = {};

	// Mapeamento de campos
	if (novoReg.frequency !== undefined) {
		novoReg.rx = novoReg.frequency;
		delete novoReg.frequency;
	}
	if (novoReg.color_code !== undefined) {
		novoReg.color = novoReg.color_code;
		delete novoReg.color_code;
	}
	if (novoReg.ts_linked !== undefined) {
		novoReg.timeslot = converterTimeslot(novoReg.ts_linked);
		delete novoReg.ts_linked;
	}
	if (novoReg.id !== undefined) {
		novoReg.info.dmr_id = novoReg.id;
		delete novoReg.id;
	}
	if (novoReg.ipsc_network !== undefined) {
		novoReg.info.ipsc = novoReg.ipsc_network;
		delete novoReg.ipsc_network;
	}
	if (novoReg.assigned !== undefined) {
		novoReg.info.assigned = novoReg.assigned;
		delete novoReg.assigned;
	}

	// Calcula frequência de transmissão
	if (novoReg.rx !== undefined && novoReg.offset !== undefined) {
		novoReg.tx = parseFloat((novoReg.rx + novoReg.offset).toFixed(5));
	}

	// Gera location inicial [UF, cidade]
	const chaveCidade = `${estadoSigla}:${cidadeProcessada}`;
	contadorCidades[chaveCidade] =
		(contadorCidades[chaveCidade] || 0) + 1;
	novoReg.location = [estadoSigla.toUpperCase(), cidadeProcessada];

	// Capitaliza campos string restantes
	Object.keys(novoReg).forEach((k) => {
		if (typeof novoReg[k] === 'string' && k !== 'location')
			novoReg[k] = commom.capitalizar(novoReg[k]);
	});

	return { estadoSigla, registro: novoReg };
}

/**
 * Processa JSON completo de repetidores
 * @param {Function} resolverCaminhos - Resolve caminhos de arquivos
 * @param {Function} carregarDados - Carrega dados
 * @param {Function} salvarDados - Salva dados processados
 * @param {Function|null} callback - Função callback opcional
 * @param {Array} fontes - Fontes de dados
 * @param {string} storageKey - Chave de cache
 * @returns {Promise<Object>} Resultados do processamento
 */
async function processarJSON(
	resolverCaminhos,
	carregarDados,
	salvarDados,
	callback = null,
	fontes = [PATH_FILE, __RPTDR_LNK],
	storageKey = 'radioid.net',
) {
	try {
		const jsonData = await carregarDados(fontes, storageKey);

		if (
			typeof jsonData !== 'object' ||
			!Array.isArray(jsonData?.rptrs)
		)
			throw new Error(`JSON inválido. Esperado objeto com '.rptrs'`);

		const estados = {},
			contadorCidades = {},
			resultados = {
				totalEstados: 0,
				totalRegistros: 0,
				registrosOriginais: jsonData.rptrs.length,
				arquivosGerados: [],
				estadosProcessados: [],
				contents: {},
			};

		for (const registro of jsonData.rptrs) {
			const processado = await processarRegistro(
				registro,
				contadorCidades,
			);
			if (processado) {
				const { estadoSigla, registro: regProcessado } = processado;
				if (!estados[estadoSigla]) estados[estadoSigla] = [];
				estados[estadoSigla].push(regProcessado);
			}
		}

		cacheProcessado = estados;

		// Salva dados por estado
		for (const [estadoSigla, registros] of Object.entries(estados)) {
			const contadorPorCidade = {};
			// Contagem por cidade
			registros.forEach((r) => {
				const cidade = r.location[1];
				const chave = `${estadoSigla}:${cidade}`;
				contadorPorCidade[chave] =
					(contadorPorCidade[chave] || 0) + 1;
			});
			const contadorAtual = {};
			registros.forEach((r) => {
				const cidade = r.location[1];
				const chave = `${estadoSigla}:${cidade}`;
				if (contadorPorCidade[chave] > 1) {
					contadorAtual[chave] = (contadorAtual[chave] || 0) + 1;
					r.location.push(contadorAtual[chave]);
				}
			});
			// Ordena por cidade
			registros.sort((a, b) =>
				a.location[1].localeCompare(b.location[1]),
			);

			const caminhos = resolverCaminhos('', estadoSigla);
			const arquivoSalvo = await salvarDados(
				registros,
				caminhos,
				estadoSigla,
			);

			resultados.contents[estadoSigla] = registros;
			resultados.totalEstados++;
			resultados.totalRegistros += registros.length;
			resultados.arquivosGerados.push(arquivoSalvo);
			resultados.estadosProcessados.push(estadoSigla);

			console.log(
				`Estado ${estadoSigla.toUpperCase()}: ${
					registros.length
				} registros`,
			);
		}

		console.log(
			`\nProcessado: ${resultados.totalEstados} estados, ${resultados.totalRegistros} registros (original: ${resultados.registrosOriginais})`,
		);

		if (typeof callback === 'function') callback(null, resultados);
		return resultados;
	} catch (error) {
		console.error('Erro ao processar:', error);
		if (typeof callback === 'function') callback(error, null);
		throw error;
	}
}

// Exports para Node.js e Browser
if (!isNODE) window.processarJSON = processarJSON;
else module.exports = { processarJSON };
