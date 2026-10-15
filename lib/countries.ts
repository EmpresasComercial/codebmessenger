import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import type { CountryCode } from 'libphonenumber-js/max';

export interface Country {
  name: string;
  code: string;
  dial_code: string;
  emoji: string;
  /** Maximum digits typed in the national number field, excluding the dial code. */
  maxLength: number;
}

export const COUNTRIES: Country[] = [
  {
    "name": "Angola",
    "code": "AO",
    "dial_code": "+244",
    "emoji": "🇦🇴",
    "maxLength": 11
  },
  {
    "name": "Portugal",
    "code": "PT",
    "dial_code": "+351",
    "emoji": "🇵🇹",
    "maxLength": 11
  },
  {
    "name": "Brasil",
    "code": "BR",
    "dial_code": "+55",
    "emoji": "🇧🇷",
    "maxLength": 13
  },
  {
    "name": "Reino Unido",
    "code": "GB",
    "dial_code": "+44",
    "emoji": "🇬🇧",
    "maxLength": 11
  },
  {
    "name": "Estados Unidos",
    "code": "US",
    "dial_code": "+1",
    "emoji": "🇺🇸",
    "maxLength": 12
  },
  {
    "name": "China",
    "code": "CN",
    "dial_code": "+86",
    "emoji": "🇨🇳",
    "maxLength": 13
  },
  {
    "name": "Paraguai",
    "code": "PY",
    "dial_code": "+595",
    "emoji": "🇵🇾",
    "maxLength": 11
  },
  {
    "name": "Moçambique",
    "code": "MZ",
    "dial_code": "+258",
    "emoji": "🇲🇿",
    "maxLength": 11
  },
  {
    "name": "Cabo Verde",
    "code": "CV",
    "dial_code": "+238",
    "emoji": "🇨🇻",
    "maxLength": 10
  },
  {
    "name": "Guiné-Bissau",
    "code": "GW",
    "dial_code": "+245",
    "emoji": "🇬🇼",
    "maxLength": 11
  },
  {
    "name": "São Tomé e Príncipe",
    "code": "ST",
    "dial_code": "+239",
    "emoji": "🇸🇹",
    "maxLength": 10
  },
  {
    "name": "Timor-Leste",
    "code": "TL",
    "dial_code": "+670",
    "emoji": "🇹🇱",
    "maxLength": 10
  },
  {
    "name": "Espanha",
    "code": "ES",
    "dial_code": "+34",
    "emoji": "🇪🇸",
    "maxLength": 11
  },
  {
    "name": "França",
    "code": "FR",
    "dial_code": "+33",
    "emoji": "🇫🇷",
    "maxLength": 11
  },
  {
    "name": "Alemanha",
    "code": "DE",
    "dial_code": "+49",
    "emoji": "🇩🇪",
    "maxLength": 13
  },
  {
    "name": "Itália",
    "code": "IT",
    "dial_code": "+39",
    "emoji": "🇮🇹",
    "maxLength": 12
  },
  {
    "name": "África do Sul",
    "code": "ZA",
    "dial_code": "+27",
    "emoji": "🇿🇦",
    "maxLength": 11
  },
  {
    "name": "Afeganistão",
    "code": "AF",
    "dial_code": "+93",
    "emoji": "🇦🇫",
    "maxLength": 11
  },
  {
    "name": "Albânia",
    "code": "AL",
    "dial_code": "+355",
    "emoji": "🇦🇱",
    "maxLength": 11
  },
  {
    "name": "Andorra",
    "code": "AD",
    "dial_code": "+376",
    "emoji": "🇦🇩",
    "maxLength": 10
  },
  {
    "name": "Anguila",
    "code": "AI",
    "dial_code": "+1",
    "emoji": "🇦🇮",
    "maxLength": 12
  },
  {
    "name": "Antígua e Barbuda",
    "code": "AG",
    "dial_code": "+1",
    "emoji": "🇦🇬",
    "maxLength": 12
  },
  {
    "name": "Arábia Saudita",
    "code": "SA",
    "dial_code": "+966",
    "emoji": "🇸🇦",
    "maxLength": 11
  },
  {
    "name": "Argélia",
    "code": "DZ",
    "dial_code": "+213",
    "emoji": "🇩🇿",
    "maxLength": 11
  },
  {
    "name": "Argentina",
    "code": "AR",
    "dial_code": "+54",
    "emoji": "🇦🇷",
    "maxLength": 13
  },
  {
    "name": "Armênia",
    "code": "AM",
    "dial_code": "+374",
    "emoji": "🇦🇲",
    "maxLength": 10
  },
  {
    "name": "Aruba",
    "code": "AW",
    "dial_code": "+297",
    "emoji": "🇦🇼",
    "maxLength": 10
  },
  {
    "name": "Austrália",
    "code": "AU",
    "dial_code": "+61",
    "emoji": "🇦🇺",
    "maxLength": 11
  },
  {
    "name": "Áustria",
    "code": "AT",
    "dial_code": "+43",
    "emoji": "🇦🇹",
    "maxLength": 11
  },
  {
    "name": "Azerbaijão",
    "code": "AZ",
    "dial_code": "+994",
    "emoji": "🇦🇿",
    "maxLength": 11
  },
  {
    "name": "Bahamas",
    "code": "BS",
    "dial_code": "+1",
    "emoji": "🇧🇸",
    "maxLength": 12
  },
  {
    "name": "Bangladesh",
    "code": "BD",
    "dial_code": "+880",
    "emoji": "🇧🇩",
    "maxLength": 12
  },
  {
    "name": "Barbados",
    "code": "BB",
    "dial_code": "+1",
    "emoji": "🇧🇧",
    "maxLength": 12
  },
  {
    "name": "Barein",
    "code": "BH",
    "dial_code": "+973",
    "emoji": "🇧🇭",
    "maxLength": 10
  },
  {
    "name": "Bélgica",
    "code": "BE",
    "dial_code": "+32",
    "emoji": "🇧🇪",
    "maxLength": 11
  },
  {
    "name": "Belize",
    "code": "BZ",
    "dial_code": "+501",
    "emoji": "🇧🇿",
    "maxLength": 10
  },
  {
    "name": "Benin",
    "code": "BJ",
    "dial_code": "+229",
    "emoji": "🇧🇯",
    "maxLength": 12
  },
  {
    "name": "Bermudas",
    "code": "BM",
    "dial_code": "+1",
    "emoji": "🇧🇲",
    "maxLength": 12
  },
  {
    "name": "Bielorrússia",
    "code": "BY",
    "dial_code": "+375",
    "emoji": "🇧🇾",
    "maxLength": 11
  },
  {
    "name": "Bolívia",
    "code": "BO",
    "dial_code": "+591",
    "emoji": "🇧🇴",
    "maxLength": 10
  },
  {
    "name": "Bósnia e Herzegovina",
    "code": "BA",
    "dial_code": "+387",
    "emoji": "🇧🇦",
    "maxLength": 10
  },
  {
    "name": "Botsuana",
    "code": "BW",
    "dial_code": "+267",
    "emoji": "🇧🇼",
    "maxLength": 10
  },
  {
    "name": "Brunei",
    "code": "BN",
    "dial_code": "+673",
    "emoji": "🇧🇳",
    "maxLength": 10
  },
  {
    "name": "Bulgária",
    "code": "BG",
    "dial_code": "+359",
    "emoji": "🇧🇬",
    "maxLength": 10
  },
  {
    "name": "Burquina Faso",
    "code": "BF",
    "dial_code": "+226",
    "emoji": "🇧🇫",
    "maxLength": 10
  },
  {
    "name": "Burundi",
    "code": "BI",
    "dial_code": "+257",
    "emoji": "🇧🇮",
    "maxLength": 10
  },
  {
    "name": "Butão",
    "code": "BT",
    "dial_code": "+975",
    "emoji": "🇧🇹",
    "maxLength": 10
  },
  {
    "name": "Camarões",
    "code": "CM",
    "dial_code": "+237",
    "emoji": "🇨🇲",
    "maxLength": 11
  },
  {
    "name": "Camboja",
    "code": "KH",
    "dial_code": "+855",
    "emoji": "🇰🇭",
    "maxLength": 10
  },
  {
    "name": "Canadá",
    "code": "CA",
    "dial_code": "+1",
    "emoji": "🇨🇦",
    "maxLength": 12
  },
  {
    "name": "Catar",
    "code": "QA",
    "dial_code": "+974",
    "emoji": "🇶🇦",
    "maxLength": 10
  },
  {
    "name": "Cazaquistão",
    "code": "KZ",
    "dial_code": "+7",
    "emoji": "🇰🇿",
    "maxLength": 12
  },
  {
    "name": "Chade",
    "code": "TD",
    "dial_code": "+235",
    "emoji": "🇹🇩",
    "maxLength": 10
  },
  {
    "name": "Chile",
    "code": "CL",
    "dial_code": "+56",
    "emoji": "🇨🇱",
    "maxLength": 11
  },
  {
    "name": "Chipre",
    "code": "CY",
    "dial_code": "+357",
    "emoji": "🇨🇾",
    "maxLength": 10
  },
  {
    "name": "Cidade do Vaticano",
    "code": "VA",
    "dial_code": "+39",
    "emoji": "🇻🇦",
    "maxLength": 12
  },
  {
    "name": "Colômbia",
    "code": "CO",
    "dial_code": "+57",
    "emoji": "🇨🇴",
    "maxLength": 12
  },
  {
    "name": "Comores",
    "code": "KM",
    "dial_code": "+269",
    "emoji": "🇰🇲",
    "maxLength": 10
  },
  {
    "name": "Congo - Kinshasa",
    "code": "CD",
    "dial_code": "+243",
    "emoji": "🇨🇩",
    "maxLength": 11
  },
  {
    "name": "Coreia do Norte",
    "code": "KP",
    "dial_code": "+850",
    "emoji": "🇰🇵",
    "maxLength": 12
  },
  {
    "name": "Coreia do Sul",
    "code": "KR",
    "dial_code": "+82",
    "emoji": "🇰🇷",
    "maxLength": 12
  },
  {
    "name": "Costa do Marfim",
    "code": "CI",
    "dial_code": "+225",
    "emoji": "🇨🇮",
    "maxLength": 12
  },
  {
    "name": "Costa Rica",
    "code": "CR",
    "dial_code": "+506",
    "emoji": "🇨🇷",
    "maxLength": 10
  },
  {
    "name": "Croácia",
    "code": "HR",
    "dial_code": "+385",
    "emoji": "🇭🇷",
    "maxLength": 11
  },
  {
    "name": "Cuba",
    "code": "CU",
    "dial_code": "+53",
    "emoji": "🇨🇺",
    "maxLength": 10
  },
  {
    "name": "Curaçao",
    "code": "CW",
    "dial_code": "+599",
    "emoji": "🇨🇼",
    "maxLength": 10
  },
  {
    "name": "Dinamarca",
    "code": "DK",
    "dial_code": "+45",
    "emoji": "🇩🇰",
    "maxLength": 10
  },
  {
    "name": "Djibuti",
    "code": "DJ",
    "dial_code": "+253",
    "emoji": "🇩🇯",
    "maxLength": 10
  },
  {
    "name": "Dominica",
    "code": "DM",
    "dial_code": "+1",
    "emoji": "🇩🇲",
    "maxLength": 12
  },
  {
    "name": "Egito",
    "code": "EG",
    "dial_code": "+20",
    "emoji": "🇪🇬",
    "maxLength": 12
  },
  {
    "name": "El Salvador",
    "code": "SV",
    "dial_code": "+503",
    "emoji": "🇸🇻",
    "maxLength": 10
  },
  {
    "name": "Emirados Árabes Unidos",
    "code": "AE",
    "dial_code": "+971",
    "emoji": "🇦🇪",
    "maxLength": 11
  },
  {
    "name": "Equador",
    "code": "EC",
    "dial_code": "+593",
    "emoji": "🇪🇨",
    "maxLength": 11
  },
  {
    "name": "Eritreia",
    "code": "ER",
    "dial_code": "+291",
    "emoji": "🇪🇷",
    "maxLength": 10
  },
  {
    "name": "Eslováquia",
    "code": "SK",
    "dial_code": "+421",
    "emoji": "🇸🇰",
    "maxLength": 11
  },
  {
    "name": "Eslovênia",
    "code": "SI",
    "dial_code": "+386",
    "emoji": "🇸🇮",
    "maxLength": 10
  },
  {
    "name": "Essuatíni",
    "code": "SZ",
    "dial_code": "+268",
    "emoji": "🇸🇿",
    "maxLength": 10
  },
  {
    "name": "Estônia",
    "code": "EE",
    "dial_code": "+372",
    "emoji": "🇪🇪",
    "maxLength": 10
  },
  {
    "name": "Etiópia",
    "code": "ET",
    "dial_code": "+251",
    "emoji": "🇪🇹",
    "maxLength": 11
  },
  {
    "name": "Fiji",
    "code": "FJ",
    "dial_code": "+679",
    "emoji": "🇫🇯",
    "maxLength": 10
  },
  {
    "name": "Filipinas",
    "code": "PH",
    "dial_code": "+63",
    "emoji": "🇵🇭",
    "maxLength": 12
  },
  {
    "name": "Finlândia",
    "code": "FI",
    "dial_code": "+358",
    "emoji": "🇫🇮",
    "maxLength": 11
  },
  {
    "name": "Gabão",
    "code": "GA",
    "dial_code": "+241",
    "emoji": "🇬🇦",
    "maxLength": 10
  },
  {
    "name": "Gâmbia",
    "code": "GM",
    "dial_code": "+220",
    "emoji": "🇬🇲",
    "maxLength": 10
  },
  {
    "name": "Gana",
    "code": "GH",
    "dial_code": "+233",
    "emoji": "🇬🇭",
    "maxLength": 11
  },
  {
    "name": "Geórgia",
    "code": "GE",
    "dial_code": "+995",
    "emoji": "🇬🇪",
    "maxLength": 11
  },
  {
    "name": "Gibraltar",
    "code": "GI",
    "dial_code": "+350",
    "emoji": "🇬🇮",
    "maxLength": 10
  },
  {
    "name": "Granada",
    "code": "GD",
    "dial_code": "+1",
    "emoji": "🇬🇩",
    "maxLength": 12
  },
  {
    "name": "Grécia",
    "code": "GR",
    "dial_code": "+30",
    "emoji": "🇬🇷",
    "maxLength": 12
  },
  {
    "name": "Groenlândia",
    "code": "GL",
    "dial_code": "+299",
    "emoji": "🇬🇱",
    "maxLength": 10
  },
  {
    "name": "Guadalupe",
    "code": "GP",
    "dial_code": "+590",
    "emoji": "🇬🇵",
    "maxLength": 11
  },
  {
    "name": "Guam",
    "code": "GU",
    "dial_code": "+1",
    "emoji": "🇬🇺",
    "maxLength": 12
  },
  {
    "name": "Guatemala",
    "code": "GT",
    "dial_code": "+502",
    "emoji": "🇬🇹",
    "maxLength": 10
  },
  {
    "name": "Guernsey",
    "code": "GG",
    "dial_code": "+44",
    "emoji": "🇬🇬",
    "maxLength": 12
  },
  {
    "name": "Guiana",
    "code": "GY",
    "dial_code": "+592",
    "emoji": "🇬🇾",
    "maxLength": 10
  },
  {
    "name": "Guiana Francesa",
    "code": "GF",
    "dial_code": "+594",
    "emoji": "🇬🇫",
    "maxLength": 11
  },
  {
    "name": "Guiné",
    "code": "GN",
    "dial_code": "+224",
    "emoji": "🇬🇳",
    "maxLength": 11
  },
  {
    "name": "Guiné Equatorial",
    "code": "GQ",
    "dial_code": "+240",
    "emoji": "🇬🇶",
    "maxLength": 11
  },
  {
    "name": "Haiti",
    "code": "HT",
    "dial_code": "+509",
    "emoji": "🇭🇹",
    "maxLength": 10
  },
  {
    "name": "Honduras",
    "code": "HN",
    "dial_code": "+504",
    "emoji": "🇭🇳",
    "maxLength": 10
  },
  {
    "name": "Hong Kong, RAE da China",
    "code": "HK",
    "dial_code": "+852",
    "emoji": "🇭🇰",
    "maxLength": 10
  },
  {
    "name": "Hungria",
    "code": "HU",
    "dial_code": "+36",
    "emoji": "🇭🇺",
    "maxLength": 11
  },
  {
    "name": "Iêmen",
    "code": "YE",
    "dial_code": "+967",
    "emoji": "🇾🇪",
    "maxLength": 11
  },
  {
    "name": "Ilha Christmas",
    "code": "CX",
    "dial_code": "+61",
    "emoji": "🇨🇽",
    "maxLength": 11
  },
  {
    "name": "Ilha de Ascensão",
    "code": "AC",
    "dial_code": "+247",
    "emoji": "🇦🇨",
    "maxLength": 10
  },
  {
    "name": "Ilha de Man",
    "code": "IM",
    "dial_code": "+44",
    "emoji": "🇮🇲",
    "maxLength": 12
  },
  {
    "name": "Ilha Norfolk",
    "code": "NF",
    "dial_code": "+672",
    "emoji": "🇳🇫",
    "maxLength": 10
  },
  {
    "name": "Ilhas Aland",
    "code": "AX",
    "dial_code": "+358",
    "emoji": "🇦🇽",
    "maxLength": 11
  },
  {
    "name": "Ilhas Cayman",
    "code": "KY",
    "dial_code": "+1",
    "emoji": "🇰🇾",
    "maxLength": 12
  },
  {
    "name": "Ilhas Cocos (Keeling)",
    "code": "CC",
    "dial_code": "+61",
    "emoji": "🇨🇨",
    "maxLength": 11
  },
  {
    "name": "Ilhas Cook",
    "code": "CK",
    "dial_code": "+682",
    "emoji": "🇨🇰",
    "maxLength": 10
  },
  {
    "name": "Ilhas Faroé",
    "code": "FO",
    "dial_code": "+298",
    "emoji": "🇫🇴",
    "maxLength": 10
  },
  {
    "name": "Ilhas Malvinas",
    "code": "FK",
    "dial_code": "+500",
    "emoji": "🇫🇰",
    "maxLength": 10
  },
  {
    "name": "Ilhas Marianas do Norte",
    "code": "MP",
    "dial_code": "+1",
    "emoji": "🇲🇵",
    "maxLength": 12
  },
  {
    "name": "Ilhas Marshall",
    "code": "MH",
    "dial_code": "+692",
    "emoji": "🇲🇭",
    "maxLength": 10
  },
  {
    "name": "Ilhas Salomão",
    "code": "SB",
    "dial_code": "+677",
    "emoji": "🇸🇧",
    "maxLength": 10
  },
  {
    "name": "Ilhas Turcas e Caicos",
    "code": "TC",
    "dial_code": "+1",
    "emoji": "🇹🇨",
    "maxLength": 12
  },
  {
    "name": "Ilhas Virgens Americanas",
    "code": "VI",
    "dial_code": "+1",
    "emoji": "🇻🇮",
    "maxLength": 12
  },
  {
    "name": "Ilhas Virgens Britânicas",
    "code": "VG",
    "dial_code": "+1",
    "emoji": "🇻🇬",
    "maxLength": 12
  },
  {
    "name": "Índia",
    "code": "IN",
    "dial_code": "+91",
    "emoji": "🇮🇳",
    "maxLength": 12
  },
  {
    "name": "Indonésia",
    "code": "ID",
    "dial_code": "+62",
    "emoji": "🇮🇩",
    "maxLength": 11
  },
  {
    "name": "Irã",
    "code": "IR",
    "dial_code": "+98",
    "emoji": "🇮🇷",
    "maxLength": 12
  },
  {
    "name": "Iraque",
    "code": "IQ",
    "dial_code": "+964",
    "emoji": "🇮🇶",
    "maxLength": 12
  },
  {
    "name": "Irlanda",
    "code": "IE",
    "dial_code": "+353",
    "emoji": "🇮🇪",
    "maxLength": 11
  },
  {
    "name": "Islândia",
    "code": "IS",
    "dial_code": "+354",
    "emoji": "🇮🇸",
    "maxLength": 10
  },
  {
    "name": "Israel",
    "code": "IL",
    "dial_code": "+972",
    "emoji": "🇮🇱",
    "maxLength": 11
  },
  {
    "name": "Jamaica",
    "code": "JM",
    "dial_code": "+1",
    "emoji": "🇯🇲",
    "maxLength": 12
  },
  {
    "name": "Japão",
    "code": "JP",
    "dial_code": "+81",
    "emoji": "🇯🇵",
    "maxLength": 12
  },
  {
    "name": "Jersey",
    "code": "JE",
    "dial_code": "+44",
    "emoji": "🇯🇪",
    "maxLength": 12
  },
  {
    "name": "Jordânia",
    "code": "JO",
    "dial_code": "+962",
    "emoji": "🇯🇴",
    "maxLength": 11
  },
  {
    "name": "Kosovo",
    "code": "XK",
    "dial_code": "+383",
    "emoji": "🇽🇰",
    "maxLength": 10
  },
  {
    "name": "Kuwait",
    "code": "KW",
    "dial_code": "+965",
    "emoji": "🇰🇼",
    "maxLength": 10
  },
  {
    "name": "Laos",
    "code": "LA",
    "dial_code": "+856",
    "emoji": "🇱🇦",
    "maxLength": 12
  },
  {
    "name": "Lesoto",
    "code": "LS",
    "dial_code": "+266",
    "emoji": "🇱🇸",
    "maxLength": 10
  },
  {
    "name": "Letônia",
    "code": "LV",
    "dial_code": "+371",
    "emoji": "🇱🇻",
    "maxLength": 10
  },
  {
    "name": "Líbano",
    "code": "LB",
    "dial_code": "+961",
    "emoji": "🇱🇧",
    "maxLength": 10
  },
  {
    "name": "Libéria",
    "code": "LR",
    "dial_code": "+231",
    "emoji": "🇱🇷",
    "maxLength": 11
  },
  {
    "name": "Líbia",
    "code": "LY",
    "dial_code": "+218",
    "emoji": "🇱🇾",
    "maxLength": 11
  },
  {
    "name": "Liechtenstein",
    "code": "LI",
    "dial_code": "+423",
    "emoji": "🇱🇮",
    "maxLength": 11
  },
  {
    "name": "Lituânia",
    "code": "LT",
    "dial_code": "+370",
    "emoji": "🇱🇹",
    "maxLength": 10
  },
  {
    "name": "Luxemburgo",
    "code": "LU",
    "dial_code": "+352",
    "emoji": "🇱🇺",
    "maxLength": 11
  },
  {
    "name": "Macau, RAE da China",
    "code": "MO",
    "dial_code": "+853",
    "emoji": "🇲🇴",
    "maxLength": 10
  },
  {
    "name": "Macedônia do Norte",
    "code": "MK",
    "dial_code": "+389",
    "emoji": "🇲🇰",
    "maxLength": 10
  },
  {
    "name": "Madagáscar",
    "code": "MG",
    "dial_code": "+261",
    "emoji": "🇲🇬",
    "maxLength": 11
  },
  {
    "name": "Malásia",
    "code": "MY",
    "dial_code": "+60",
    "emoji": "🇲🇾",
    "maxLength": 11
  },
  {
    "name": "Malaui",
    "code": "MW",
    "dial_code": "+265",
    "emoji": "🇲🇼",
    "maxLength": 11
  },
  {
    "name": "Maldivas",
    "code": "MV",
    "dial_code": "+960",
    "emoji": "🇲🇻",
    "maxLength": 10
  },
  {
    "name": "Mali",
    "code": "ML",
    "dial_code": "+223",
    "emoji": "🇲🇱",
    "maxLength": 10
  },
  {
    "name": "Malta",
    "code": "MT",
    "dial_code": "+356",
    "emoji": "🇲🇹",
    "maxLength": 10
  },
  {
    "name": "Marrocos",
    "code": "MA",
    "dial_code": "+212",
    "emoji": "🇲🇦",
    "maxLength": 11
  },
  {
    "name": "Martinica",
    "code": "MQ",
    "dial_code": "+596",
    "emoji": "🇲🇶",
    "maxLength": 11
  },
  {
    "name": "Maurício",
    "code": "MU",
    "dial_code": "+230",
    "emoji": "🇲🇺",
    "maxLength": 10
  },
  {
    "name": "Mauritânia",
    "code": "MR",
    "dial_code": "+222",
    "emoji": "🇲🇷",
    "maxLength": 10
  },
  {
    "name": "Mayotte",
    "code": "YT",
    "dial_code": "+262",
    "emoji": "🇾🇹",
    "maxLength": 11
  },
  {
    "name": "México",
    "code": "MX",
    "dial_code": "+52",
    "emoji": "🇲🇽",
    "maxLength": 12
  },
  {
    "name": "Mianmar (Birmânia)",
    "code": "MM",
    "dial_code": "+95",
    "emoji": "🇲🇲",
    "maxLength": 10
  },
  {
    "name": "Micronésia",
    "code": "FM",
    "dial_code": "+691",
    "emoji": "🇫🇲",
    "maxLength": 10
  },
  {
    "name": "Moldávia",
    "code": "MD",
    "dial_code": "+373",
    "emoji": "🇲🇩",
    "maxLength": 10
  },
  {
    "name": "Mônaco",
    "code": "MC",
    "dial_code": "+377",
    "emoji": "🇲🇨",
    "maxLength": 11
  },
  {
    "name": "Mongólia",
    "code": "MN",
    "dial_code": "+976",
    "emoji": "🇲🇳",
    "maxLength": 10
  },
  {
    "name": "Montenegro",
    "code": "ME",
    "dial_code": "+382",
    "emoji": "🇲🇪",
    "maxLength": 10
  },
  {
    "name": "Montserrat",
    "code": "MS",
    "dial_code": "+1",
    "emoji": "🇲🇸",
    "maxLength": 12
  },
  {
    "name": "Namíbia",
    "code": "NA",
    "dial_code": "+264",
    "emoji": "🇳🇦",
    "maxLength": 11
  },
  {
    "name": "Nauru",
    "code": "NR",
    "dial_code": "+674",
    "emoji": "🇳🇷",
    "maxLength": 10
  },
  {
    "name": "Nepal",
    "code": "NP",
    "dial_code": "+977",
    "emoji": "🇳🇵",
    "maxLength": 12
  },
  {
    "name": "Nicarágua",
    "code": "NI",
    "dial_code": "+505",
    "emoji": "🇳🇮",
    "maxLength": 10
  },
  {
    "name": "Níger",
    "code": "NE",
    "dial_code": "+227",
    "emoji": "🇳🇪",
    "maxLength": 10
  },
  {
    "name": "Nigéria",
    "code": "NG",
    "dial_code": "+234",
    "emoji": "🇳🇬",
    "maxLength": 12
  },
  {
    "name": "Niue",
    "code": "NU",
    "dial_code": "+683",
    "emoji": "🇳🇺",
    "maxLength": 10
  },
  {
    "name": "Noruega",
    "code": "NO",
    "dial_code": "+47",
    "emoji": "🇳🇴",
    "maxLength": 10
  },
  {
    "name": "Nova Caledônia",
    "code": "NC",
    "dial_code": "+687",
    "emoji": "🇳🇨",
    "maxLength": 10
  },
  {
    "name": "Nova Zelândia",
    "code": "NZ",
    "dial_code": "+64",
    "emoji": "🇳🇿",
    "maxLength": 11
  },
  {
    "name": "Omã",
    "code": "OM",
    "dial_code": "+968",
    "emoji": "🇴🇲",
    "maxLength": 10
  },
  {
    "name": "Países Baixos",
    "code": "NL",
    "dial_code": "+31",
    "emoji": "🇳🇱",
    "maxLength": 11
  },
  {
    "name": "Países Baixos Caribenhos",
    "code": "BQ",
    "dial_code": "+599",
    "emoji": "🇧🇶",
    "maxLength": 10
  },
  {
    "name": "Palau",
    "code": "PW",
    "dial_code": "+680",
    "emoji": "🇵🇼",
    "maxLength": 10
  },
  {
    "name": "Panamá",
    "code": "PA",
    "dial_code": "+507",
    "emoji": "🇵🇦",
    "maxLength": 10
  },
  {
    "name": "Papua-Nova Guiné",
    "code": "PG",
    "dial_code": "+675",
    "emoji": "🇵🇬",
    "maxLength": 10
  },
  {
    "name": "Paquistão",
    "code": "PK",
    "dial_code": "+92",
    "emoji": "🇵🇰",
    "maxLength": 12
  },
  {
    "name": "Peru",
    "code": "PE",
    "dial_code": "+51",
    "emoji": "🇵🇪",
    "maxLength": 11
  },
  {
    "name": "Polinésia Francesa",
    "code": "PF",
    "dial_code": "+689",
    "emoji": "🇵🇫",
    "maxLength": 10
  },
  {
    "name": "Polónia",
    "code": "PL",
    "dial_code": "+48",
    "emoji": "🇵🇱",
    "maxLength": 11
  },
  {
    "name": "Porto Rico",
    "code": "PR",
    "dial_code": "+1",
    "emoji": "🇵🇷",
    "maxLength": 12
  },
  {
    "name": "Quénia",
    "code": "KE",
    "dial_code": "+254",
    "emoji": "🇰🇪",
    "maxLength": 11
  },
  {
    "name": "Quirguistão",
    "code": "KG",
    "dial_code": "+996",
    "emoji": "🇰🇬",
    "maxLength": 11
  },
  {
    "name": "Quiribati",
    "code": "KI",
    "dial_code": "+686",
    "emoji": "🇰🇮",
    "maxLength": 10
  },
  {
    "name": "República Centro-Africana",
    "code": "CF",
    "dial_code": "+236",
    "emoji": "🇨🇫",
    "maxLength": 10
  },
  {
    "name": "República Checa",
    "code": "CZ",
    "dial_code": "+420",
    "emoji": "🇨🇿",
    "maxLength": 11
  },
  {
    "name": "República do Congo",
    "code": "CG",
    "dial_code": "+242",
    "emoji": "🇨🇬",
    "maxLength": 11
  },
  {
    "name": "República Dominicana",
    "code": "DO",
    "dial_code": "+1",
    "emoji": "🇩🇴",
    "maxLength": 12
  },
  {
    "name": "Reunião",
    "code": "RE",
    "dial_code": "+262",
    "emoji": "🇷🇪",
    "maxLength": 11
  },
  {
    "name": "Roménia",
    "code": "RO",
    "dial_code": "+40",
    "emoji": "🇷🇴",
    "maxLength": 11
  },
  {
    "name": "Ruanda",
    "code": "RW",
    "dial_code": "+250",
    "emoji": "🇷🇼",
    "maxLength": 11
  },
  {
    "name": "Rússia",
    "code": "RU",
    "dial_code": "+7",
    "emoji": "🇷🇺",
    "maxLength": 12
  },
  {
    "name": "Saara Ocidental",
    "code": "EH",
    "dial_code": "+212",
    "emoji": "🇪🇭",
    "maxLength": 11
  },
  {
    "name": "Samoa",
    "code": "WS",
    "dial_code": "+685",
    "emoji": "🇼🇸",
    "maxLength": 10
  },
  {
    "name": "Samoa Americana",
    "code": "AS",
    "dial_code": "+1",
    "emoji": "🇦🇸",
    "maxLength": 12
  },
  {
    "name": "San Marino",
    "code": "SM",
    "dial_code": "+378",
    "emoji": "🇸🇲",
    "maxLength": 10
  },
  {
    "name": "Santa Helena",
    "code": "SH",
    "dial_code": "+290",
    "emoji": "🇸🇭",
    "maxLength": 10
  },
  {
    "name": "Santa Lúcia",
    "code": "LC",
    "dial_code": "+1",
    "emoji": "🇱🇨",
    "maxLength": 12
  },
  {
    "name": "São Bartolomeu",
    "code": "BL",
    "dial_code": "+590",
    "emoji": "🇧🇱",
    "maxLength": 11
  },
  {
    "name": "São Cristóvão e Névis",
    "code": "KN",
    "dial_code": "+1",
    "emoji": "🇰🇳",
    "maxLength": 12
  },
  {
    "name": "São Martinho",
    "code": "MF",
    "dial_code": "+590",
    "emoji": "🇲🇫",
    "maxLength": 11
  },
  {
    "name": "São Pedro e Miquelão",
    "code": "PM",
    "dial_code": "+508",
    "emoji": "🇵🇲",
    "maxLength": 10
  },
  {
    "name": "São Vicente e Granadinas",
    "code": "VC",
    "dial_code": "+1",
    "emoji": "🇻🇨",
    "maxLength": 12
  },
  {
    "name": "Seicheles",
    "code": "SC",
    "dial_code": "+248",
    "emoji": "🇸🇨",
    "maxLength": 10
  },
  {
    "name": "Senegal",
    "code": "SN",
    "dial_code": "+221",
    "emoji": "🇸🇳",
    "maxLength": 11
  },
  {
    "name": "Serra Leoa",
    "code": "SL",
    "dial_code": "+232",
    "emoji": "🇸🇱",
    "maxLength": 10
  },
  {
    "name": "Sérvia",
    "code": "RS",
    "dial_code": "+381",
    "emoji": "🇷🇸",
    "maxLength": 11
  },
  {
    "name": "Singapura",
    "code": "SG",
    "dial_code": "+65",
    "emoji": "🇸🇬",
    "maxLength": 10
  },
  {
    "name": "Sint Maarten",
    "code": "SX",
    "dial_code": "+1",
    "emoji": "🇸🇽",
    "maxLength": 12
  },
  {
    "name": "Síria",
    "code": "SY",
    "dial_code": "+963",
    "emoji": "🇸🇾",
    "maxLength": 11
  },
  {
    "name": "Somália",
    "code": "SO",
    "dial_code": "+252",
    "emoji": "🇸🇴",
    "maxLength": 10
  },
  {
    "name": "Sri Lanka",
    "code": "LK",
    "dial_code": "+94",
    "emoji": "🇱🇰",
    "maxLength": 11
  },
  {
    "name": "Sudão",
    "code": "SD",
    "dial_code": "+249",
    "emoji": "🇸🇩",
    "maxLength": 11
  },
  {
    "name": "Sudão do Sul",
    "code": "SS",
    "dial_code": "+211",
    "emoji": "🇸🇸",
    "maxLength": 11
  },
  {
    "name": "Suécia",
    "code": "SE",
    "dial_code": "+46",
    "emoji": "🇸🇪",
    "maxLength": 11
  },
  {
    "name": "Suíça",
    "code": "CH",
    "dial_code": "+41",
    "emoji": "🇨🇭",
    "maxLength": 11
  },
  {
    "name": "Suriname",
    "code": "SR",
    "dial_code": "+597",
    "emoji": "🇸🇷",
    "maxLength": 10
  },
  {
    "name": "Svalbard e Jan Mayen",
    "code": "SJ",
    "dial_code": "+47",
    "emoji": "🇸🇯",
    "maxLength": 10
  },
  {
    "name": "Tadjiquistão",
    "code": "TJ",
    "dial_code": "+992",
    "emoji": "🇹🇯",
    "maxLength": 11
  },
  {
    "name": "Tailândia",
    "code": "TH",
    "dial_code": "+66",
    "emoji": "🇹🇭",
    "maxLength": 11
  },
  {
    "name": "Taiwan",
    "code": "TW",
    "dial_code": "+886",
    "emoji": "🇹🇼",
    "maxLength": 11
  },
  {
    "name": "Tanzânia",
    "code": "TZ",
    "dial_code": "+255",
    "emoji": "🇹🇿",
    "maxLength": 11
  },
  {
    "name": "Território Britânico do Oceano Índico",
    "code": "IO",
    "dial_code": "+246",
    "emoji": "🇮🇴",
    "maxLength": 10
  },
  {
    "name": "Territórios palestinos",
    "code": "PS",
    "dial_code": "+970",
    "emoji": "🇵🇸",
    "maxLength": 11
  },
  {
    "name": "Togo",
    "code": "TG",
    "dial_code": "+228",
    "emoji": "🇹🇬",
    "maxLength": 10
  },
  {
    "name": "Tokelau",
    "code": "TK",
    "dial_code": "+690",
    "emoji": "🇹🇰",
    "maxLength": 10
  },
  {
    "name": "Tonga",
    "code": "TO",
    "dial_code": "+676",
    "emoji": "🇹🇴",
    "maxLength": 10
  },
  {
    "name": "Trinidad e Tobago",
    "code": "TT",
    "dial_code": "+1",
    "emoji": "🇹🇹",
    "maxLength": 12
  },
  {
    "name": "Tristão da Cunha",
    "code": "TA",
    "dial_code": "+290",
    "emoji": "🇹🇦",
    "maxLength": 10
  },
  {
    "name": "Tunísia",
    "code": "TN",
    "dial_code": "+216",
    "emoji": "🇹🇳",
    "maxLength": 10
  },
  {
    "name": "Turcomenistão",
    "code": "TM",
    "dial_code": "+993",
    "emoji": "🇹🇲",
    "maxLength": 10
  },
  {
    "name": "Turquia",
    "code": "TR",
    "dial_code": "+90",
    "emoji": "🇹🇷",
    "maxLength": 12
  },
  {
    "name": "Tuvalu",
    "code": "TV",
    "dial_code": "+688",
    "emoji": "🇹🇻",
    "maxLength": 10
  },
  {
    "name": "Ucrânia",
    "code": "UA",
    "dial_code": "+380",
    "emoji": "🇺🇦",
    "maxLength": 11
  },
  {
    "name": "Uganda",
    "code": "UG",
    "dial_code": "+256",
    "emoji": "🇺🇬",
    "maxLength": 11
  },
  {
    "name": "Uruguai",
    "code": "UY",
    "dial_code": "+598",
    "emoji": "🇺🇾",
    "maxLength": 10
  },
  {
    "name": "Uzbequistão",
    "code": "UZ",
    "dial_code": "+998",
    "emoji": "🇺🇿",
    "maxLength": 11
  },
  {
    "name": "Vanuatu",
    "code": "VU",
    "dial_code": "+678",
    "emoji": "🇻🇺",
    "maxLength": 10
  },
  {
    "name": "Venezuela",
    "code": "VE",
    "dial_code": "+58",
    "emoji": "🇻🇪",
    "maxLength": 12
  },
  {
    "name": "Vietname",
    "code": "VN",
    "dial_code": "+84",
    "emoji": "🇻🇳",
    "maxLength": 11
  },
  {
    "name": "Wallis e Futuna",
    "code": "WF",
    "dial_code": "+681",
    "emoji": "🇼🇫",
    "maxLength": 10
  },
  {
    "name": "Zâmbia",
    "code": "ZM",
    "dial_code": "+260",
    "emoji": "🇿🇲",
    "maxLength": 11
  },
  {
    "name": "Zimbábue",
    "code": "ZW",
    "dial_code": "+263",
    "emoji": "🇿🇼",
    "maxLength": 11
  }
];

export interface PhoneValidationResult {
  isValid: boolean;
  errorMessage?: string;
  nationalNumber: string;
  fullNumber: string;
}

/**
 * Validates a national number against the selected country, then combines it
 * with that country's calling code before checking the complete international number.
 */
export function validatePhoneNumber(phoneInput: string, country: Country): PhoneValidationResult {
  const trimmed = (phoneInput || '').trim();
  if (!trimmed) {
    return {
      isValid: false,
      errorMessage: `Introduza um número de telefone válido de ${country.name}.`,
      nationalNumber: '',
      fullNumber: '',
    };
  }

  const dialDigits = country.dial_code.replace(/\D/g, '');
  let digits = trimmed.replace(/\D/g, '');

  if (digits.length === 0) {
    return {
      isValid: false,
      errorMessage: `Introduza um número de telefone válido de ${country.name}.`,
      nationalNumber: '',
      fullNumber: '',
    };
  }

  // If user pasted/typed with '+'
  if (trimmed.startsWith('+')) {
    const parsedWithPlus = parsePhoneNumberFromString(trimmed);
    if (parsedWithPlus) {
      if (parsedWithPlus.countryCallingCode !== dialDigits) {
        return {
          isValid: false,
          errorMessage: `Introduza um número de telefone válido de ${country.name}.`,
          nationalNumber: digits,
          fullNumber: trimmed,
        };
      }
      digits = parsedWithPlus.nationalNumber;
    }
  } else if (digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5) {
    // If user typed the country code without plus (e.g. 244928809034 for Angola)
    digits = digits.slice(dialDigits.length);
  }

  // Country-specific validations
  if (country.code === 'AO') {
    // Angola: 9 digits, typically starts with 9 for mobile (91, 92, 93, 94, 95, 97, 99) or 2 for landline
    if (digits.length !== 9 || (!digits.startsWith('9') && !digits.startsWith('2'))) {
      return {
        isValid: false,
        errorMessage: 'Introduza um número de telefone válido de Angola.',
        nationalNumber: digits,
        fullNumber: `+${dialDigits}${digits}`,
      };
    }
  }

  const fullE164 = `+${dialDigits}${digits}`;
  const parsed = parsePhoneNumberFromString(fullE164, country.code as CountryCode);

  if (!parsed || !parsed.isValid()) {
    return {
      isValid: false,
      errorMessage: `Introduza um número de telefone válido de ${country.name}.`,
      nationalNumber: digits,
      fullNumber: fullE164,
    };
  }

  // Ensure it matches the selected country's calling code
  if (parsed.countryCallingCode !== dialDigits) {
    return {
      isValid: false,
      errorMessage: `Introduza um número de telefone válido de ${country.name}.`,
      nationalNumber: digits,
      fullNumber: fullE164,
    };
  }

  return {
    isValid: true,
    nationalNumber: parsed.nationalNumber || digits,
    fullNumber: parsed.number || fullE164,
  };
}

/**
 * Detects if a phone string has an international calling code
 * and returns the corresponding Country from the supported list.
 */
export function detectCountryFromPhone(input: string): { country?: Country; nationalNumber?: string } {
  const trimmed = (input || '').trim();
  if (!trimmed.startsWith('+')) return {};

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed) return {};

  const found = COUNTRIES.find(c => c.code === parsed.country) ||
                COUNTRIES.find(c => c.dial_code === '+' + parsed.countryCallingCode);

  return {
    country: found,
    nationalNumber: parsed.nationalNumber,
  };
}
