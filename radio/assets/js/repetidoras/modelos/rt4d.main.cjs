const isNODE = typeof window === 'undefined';
const commom = isNODE
	? require(`../../../../../@assets/js/common${
			isNODE ? '.main' : ''
	  }.cjs`)
	: null;

const MODEL = [
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
];

function makeCSV(
	registro,
	freqRX,
	freqTX,
	offset,
	chNumber,
	chAlias,
) {
	return [
		chNumber, // CH
		commom._ASPAS(`${formatarFrequencia(freqRX)}`), // RX Freq (em MHz formatado)
		commom._ASPAS(`${formatarFrequencia(freqTX)}`), // TX Freq (em MHz formatado)
		commom._ASPAS('Digital'), // CH Mode
		commom._ASPAS('RX+TX'), // RX/TX Limit
		commom._ASPAS('High'), // TX Power
		commom._ASPAS(60), // TOT (alterado para 60)
		commom._ASPAS('Add'), // Scan Add
		commom._ASPAS(chAlias), // CH Alias (agora usando o parâmetro)
		commom._ASPAS('Channel ID'), // ID Type
		commom._ASPAS(`${registro.id || ''}`), // CH ID
		commom._ASPAS('Off'), // Dual Slot
		commom._ASPAS(registro.ts_linked.includes('2') ? '2' : '1'), // Time Slot (convertido de TS Linked)
		commom._ASPAS(`${registro.color_code || '1'}`), // Color Code
		commom._ASPAS('Off'), // Promiscuous
		commom._ASPAS('Allow TX'), // TX Politely
		commom._ASPAS('All Call'), // TX Contacts
		commom._ASPAS('None'), // RX TG List (alterado para None)
		commom._ASPAS('None'), // DMR Encryption
		commom._ASPAS('None'), // RX CTC DCS
		commom._ASPAS('None'), // TX CTC DCS
		commom._ASPAS('Normal'), // CTC DCS Type
		commom._ASPAS(0), // Mute Code
		commom._ASPAS('Allow TX'), // Busy Lock
		commom._ASPAS('FM'), // Demodulation
		commom._ASPAS('Off'), // Tail Tone
		commom._ASPAS('Off'), // Scrambler
		commom._ASPAS('Wide'), // Bandwidth
		commom._ASPAS(`${offset.toFixed(5)}`), // Offset
	];
}

module.exports = {
	MODEL,
	makeCSV,
};

// EXPORTAÇÃO GLOBAL (browser)
if (typeof globalThis !== 'undefined') {
	globalThis.rt4dModel = MODEL;
	globalThis.rt4dMakeCSV = makeCSV;
}
