import { fail } from '@sveltejs/kit';
import PocketBase from 'pocketbase';

const POCKETHOST_URL = 'https://rest-grown.pockethost.io';
const pb = new PocketBase(POCKETHOST_URL);
const PRIVZETE_CENE = {
    jeAkcijskaCena: false,
    rednaCenaIndividualna: 170,
    rednaCenaSkupinska: 161.5,
    akcijskaIndividualna: 150,
    akcijskaSkupinska: 142.5
};

function pretvoriVCeno(vrednost, fallback) {
    if (typeof vrednost === 'number' && Number.isFinite(vrednost)) {
        return vrednost;
    }

    const normalizirano = String(vrednost ?? '')
        .trim()
        .replace(',', '.');
    const stevilka = Number(normalizirano);

    return Number.isFinite(stevilka) ? stevilka : fallback;
}

async function preberiCenikHR() {
    const pbCenik = new PocketBase(POCKETHOST_URL);

    try {
        const odgovor = await pbCenik.collection('Cenik').getList(1, 1, {
            sort: '-created',
            requestKey: null
        });

        if (odgovor.items.length > 0) {
            const cenik = odgovor.items[0];

            return {
                jeAkcijskaCena: Boolean(cenik.Akcijska_cena_HR),
                rednaCenaIndividualna: pretvoriVCeno(
                    cenik.Individualna_HR,
                    PRIVZETE_CENE.rednaCenaIndividualna
                ),
                rednaCenaSkupinska: pretvoriVCeno(
                    cenik.Skupinska_HR,
                    PRIVZETE_CENE.rednaCenaSkupinska
                ),
                akcijskaIndividualna: pretvoriVCeno(
                    cenik.Individualna_popust_HR,
                    PRIVZETE_CENE.akcijskaIndividualna
                ),
                akcijskaSkupinska: pretvoriVCeno(
                    cenik.Skupinska_popust_HR,
                    PRIVZETE_CENE.akcijskaSkupinska
                )
            };
        }
    } catch (err) {
        console.error('Greska pri citanju cjenika HR:', err);
    }

    const datumKrajAkcije = new Date('2026-04-22');
    const danas = new Date();

    return {
        ...PRIVZETE_CENE,
        jeAkcijskaCena: danas < datumKrajAkcije
    };
}

function izracunajKotizaciju(cjenik, prijavaVrsta) {
    if (prijavaVrsta === 'skupinska') {
        return cjenik.jeAkcijskaCena ? cjenik.akcijskaSkupinska : cjenik.rednaCenaSkupinska;
    }

    return cjenik.jeAkcijskaCena ? cjenik.akcijskaIndividualna : cjenik.rednaCenaIndividualna;
}

export async function load() {
    return await preberiCenikHR();
}

export const actions = {
    default: async ({ request }) => {
        const formData = await request.formData();

        const prijavaVrsta = formData.get('prijavaVrsta') || '';
        const podjetjeNaziv = formData.get('podjetjeNaziv') || '';
        const podjetjeNaslov = formData.get('podjetjeNaslov') || '';
        const podjetjeDavcna = formData.get('podjetjeDavcna') || '';

        if (!podjetjeNaziv || !podjetjeNaslov || !podjetjeDavcna) {
            return fail(400, {
                error: 'Molimo ispunite sva polja o tvrtki (naziv, adresa, porezni broj).'
            });
        }

        const cjenik = await preberiCenikHR();

        if (prijavaVrsta === 'individualna') {
            const ime = formData.get('udelezenec0_ime') || '';
            const email = formData.get('udelezenec0_email') || '';
            const telefon = formData.get('udelezenec0_telefon') || '';
            const sfd = formData.get('udelezenec0_sfd') ? true : false;

            if (!ime || !email || !telefon) {
                return fail(400, {
                    error: 'Kod individualne prijave nedostaju ime, email ili telefon.'
                });
            }

            try {
                const record = await pb.collection('HR_individualna').create({
                    Podjetje: podjetjeNaziv,
                    Naslov_sedeza_podjetja: podjetjeNaslov,
                    Davcna_stevilka: podjetjeDavcna,
                    Ime_in_priimek: ime,
                    Elektronski_naslov: email,
                    Telefonska_stevilka: telefon,
                    SFD: sfd,
                    Kotizacija: izracunajKotizacijo(cjenik, 'individualna')
                });
                console.log('Spremljena individualna prijava:', record);
            } catch (err) {
                console.error('Napaka PB (individualna):', err);
                const sporocilo = err?.response?.data ? JSON.stringify(err.response.data) : String(err);
                return fail(500, { error: `Napaka PB (individualna): ${sporocilo}` });
            }

            return {
                success: true,
                message: 'Uspjesno poslana individualna prijava.'
            };
        }

        if (prijavaVrsta === 'skupinska') {
            let i = 0;
            const seznam = [];

            while (true) {
                const ime = formData.get(`udelezenec${i}_ime`);
                if (!ime) {
                    break;
                }

                const email = (formData.get(`udelezenec${i}_email`) || '').trim();
                const telefon = formData.get(`udelezenec${i}_telefon`) || '';
                const sfd = formData.get(`udelezenec${i}_sfd`) ? true : false;

                seznam.push({ ime, email, telefon, sfd });
                i++;
            }

            if (seznam.length < 4) {
                return fail(400, {
                    error: 'Grupna prijava zahtijeva najmanje 4 sudionika.'
                });
            }

            for (const [index, ud] of seznam.entries()) {
                if (!ud.ime || !ud.email || !ud.telefon) {
                    return fail(400, {
                        error: `Sudioniku #${index + 1} nedostaju ime, email ili telefon.`
                    });
                }

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(ud.email)) {
                    return fail(400, {
                        error: `Sudioniku #${index + 1} email "${ud.email}" nije valjan.`
                    });
                }
            }

            try {
                for (const ud of seznam) {
                    const zapis = await pb.collection('HR_skupinska').create({
                        Podjetje: podjetjeNaziv,
                        Naslov_sedeza_podjetja: podjetjeNaslov,
                        Davcna_stevilka: podjetjeDavcna,
                        Ime_in_priimek: ud.ime,
                        Elektronski_naslov: ud.email,
                        Telefonska_stevilka: ud.telefon,
                        SFD: ud.sfd,
                        Kotizacija: izracunajKotizacijo(cjenik, 'skupinska')
                    });
                    console.log('Spremljena grupna prijava:', zapis);
                }
            } catch (err) {
                console.error('Napaka PB (skupinska):', err);
                const sporocilo = err?.response?.data ? JSON.stringify(err.response.data) : String(err);
                return fail(500, { error: `Napaka PB (skupinska): ${sporocilo}` });
            }

            return {
                success: true,
                message: `Uspjesno poslana grupna prijava. Sudionika: ${seznam.length}`
            };
        }

        return fail(400, {
            error: 'Nepoznata vrsta prijave.'
        });
    }
};
