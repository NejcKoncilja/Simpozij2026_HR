<script lang="ts">
    import { fade, fly } from 'svelte/transition';
    import { enhance } from '$app/forms';
    import type { ActionResult } from '@sveltejs/kit';

    interface Udelezenec {
        ime: string;
        email: string;
        telefon: string;
        sfd: boolean;
    }

    export let data: { jeAkcijskaCena: boolean; rednaCenaIndividualna: number; rednaCenaSkupinska: number; akcijskaIndividualna: number; akcijskaSkupinska: number };

    let activeTab: 'prijava' | 'program' = 'prijava';
    let prijavaVrsta: '' | 'individualna' | 'skupinska' = '';

    let podjetje = {
        naziv: '',
        naslov: '',
        davcna: ''
    };

    const jeAkcijskaCena = data.jeAkcijskaCena;
    const rednaCenaIndividualna = data.rednaCenaIndividualna;
    const rednaCenaSkupinska = data.rednaCenaSkupinska;
    const akcijskaIndividualna = data.akcijskaIndividualna;
    const akcijskaSkupinska = data.akcijskaSkupinska;

    function formatirajCeno(cena: number): string {
        return String(cena).replace('.', ',');
    }

    function ustvariUdelezenec(): Udelezenec {
        return { ime: '', email: '', telefon: '', sfd: false };
    }

    let udelezenci: Udelezenec[] = [];

    $: {
        if (prijavaVrsta === 'individualna') {
            if (udelezenci.length !== 1) {
                udelezenci = [ustvariUdelezenec()];
            }
        } else if (prijavaVrsta === 'skupinska') {
            const potrebujemo = Math.max(0, 4 - udelezenci.length);
            if (potrebujemo > 0) {
                let novi: Udelezenec[] = Array(potrebujemo).fill(null).map(() => ustvariUdelezenec());
                udelezenci = [...udelezenci, ...novi];
            }
        } else if (prijavaVrsta === '') {
            udelezenci = [];
        }
    }

    function dodajUdelezenec(): void {
        if (prijavaVrsta === 'skupinska') {
            udelezenci = [...udelezenci, ustvariUdelezenec()];
        }
    }

    function odstraniUdelezenec(index: number): void {
        if (prijavaVrsta === 'skupinska' && udelezenci.length > 4) {
            udelezenci = udelezenci.filter((_, i) => i !== index);
        } else if (prijavaVrsta === 'skupinska') {
            alert('Grupna prijava zahtijeva najmanje 4 sudionika. Ovog sudionika ne možete ukloniti.');
        }
    }

    let showGDPRModal: boolean = false;
    let showSuccessModal: boolean = false;
    let submitting: boolean = false;
    let formError: string | null = null;
    let formElement: HTMLFormElement;

    function checkFormValidation(): boolean {
        formError = null;
        if (!podjetje.naziv || !podjetje.naslov || !podjetje.davcna) {
            formError = 'Molimo, ispunite sve podatke o tvrtki (Naziv, Adresa,OIB).';
            alert(formError);
            return false;
        }
        if (!prijavaVrsta) {
            formError = 'Molimo, odaberite vrstu prijave (Individualna ili Grupna).';
            alert(formError);
            return false;
        }
        if (prijavaVrsta === 'individualna') {
            const u = udelezenci[0];
            if (!u || !u.ime || !u.email || !u.telefon) {
                formError = 'Molimo, ispunite ime, e-mail adresu i broj telefona za sudionika.';
                alert(formError);
                return false;
            }
        } else if (prijavaVrsta === 'skupinska') {
            if (udelezenci.length < 4) {
                formError = 'Grupna prijava zahtijeva najmanje 4 sudionika. Molimo, dodajte nedostajuće.';
                alert(formError);
                return false;
            }
            for (const [index, u] of udelezenci.entries()) {
                if (!u.ime || !u.email || !u.telefon) {
                    formError = `Molimo, ispunite ime, e-mail adresu i broj telefona za sudionika #${index + 1}.`;
                    alert(formError);
                    return false;
                }
            }
        }
        return true;
    }

    function triggerGDPRCheck(): void {
        if (checkFormValidation()) {
            showGDPRModal = true;
        }
    }

    function cancelGDPR(): void {
        showGDPRModal = false;
    }

    function acceptGDPRAndSubmit(): void {
        if (formElement) {
            formElement.requestSubmit();
        }
        showGDPRModal = false;
    }

    function closeSuccessModal(): void {
        showSuccessModal = false;
        activeTab = 'program';
    }

    function resetFormState(): void {
        prijavaVrsta = '';
        podjetje = { naziv: '', naslov: '', davcna: '' };
        formError = null;
    }
</script>

<svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
    <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div id="gmpForm" class="min-h-screen w-full bg-gray-50 border-t-4 border-[#0F786B] px-4 py-8 sm:px-6 md:px-8 lg:px-10 font-sans flex flex-col">
    <div class="flex-grow">
        <section class="max-w-6xl mx-auto mb-8 text-center">
            <h1 class="font-serif text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[#0F786B] mb-2">
                PRIJAVA ZA GMP SIMPOZIJ 2026
            </h1>
            <p class="text-xl text-gray-600 font-medium">Workshops and practical cases</p>
            <div class="mt-3 text-lg text-gray-500 space-y-1 md:space-y-0 md:space-x-4 flex flex-col md:flex-row justify-center items-center">
                <span class="inline-flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days">
                        <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /><path d="M16 18h.01" />
                    </svg>
                    Utorak, 9. lipnja 2026
                </span>
                <span class="hidden md:inline">|</span>
                <span class="inline-flex items-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    Terme Tuhelj, Tuheljske Toplice, Hrvatska
                </span>
            </div>
        </section>

        <nav class="max-w-6xl mx-auto mb-8 flex justify-center border-b border-gray-300">
            <button type="button" on:click={() => (activeTab = 'prijava')} class="tab-button {activeTab === 'prijava' ? 'active' : ''}">
                Prijava
            </button>
            <button type="button" on:click={() => (activeTab = 'program')} class="tab-button {activeTab === 'program' ? 'active' : ''}">
                Program
            </button>
        </nav>

        {#key activeTab}
            {#if activeTab === 'prijava'}
                <div class="tab-content-wrapper" transition:fade={{ duration: 300 }}>
                    <form
                            id="gmpFormElement"
                            method="POST"
                            use:enhance={() => {
                            submitting = true;
                            formError = null;
                            return async ({ result }: { result: ActionResult }) => {
                                if (result.type === 'success') {
                                    showSuccessModal = true;
                                    resetFormState();
                                } else if (result.type === 'failure') {
                                    if (result.data?.error) {
                                        formError = result.data.error;
                                        alert(`Greška prilikom slanja: ${formError}`);
                                    } else {
                                        formError = 'Došlo je do greške prilikom slanja prijave.';
                                        alert(formError);
                                    }
                                } else if (result.type === 'error') {
                                    formError = `Neočekivana greška: ${result.error.message}`;
                                    alert(formError);
                                    console.error('Form submission error:', result.error);
                                }
                                submitting = false;
                            };
                        }}
                            bind:this={formElement}
                            class="max-w-6xl mx-auto space-y-8"
                    >
                        <input type="hidden" name="prijavaVrsta" value={prijavaVrsta} />

                        <section class="card">
                            <h2 class="card-title">Podaci o tvrtki</h2>
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label for="podjetjeNaziv" class="label">Naziv tvrtke *</label>
                                    <input
                                            id="podjetjeNaziv"
                                            class="input"
                                            name="podjetjeNaziv"
                                            placeholder="Npr. Sanol H d.o.o."
                                            required
                                            bind:value={podjetje.naziv}
                                    />
                                </div>
                                <div>
                                    <label for="podjetjeNaslov" class="label">Adresa tvrtke *</label>
                                    <input
                                            id="podjetjeNaslov"
                                            class="input"
                                            name="podjetjeNaslov"
                                            placeholder="Npr. Franje Lučića 32, Zagreb"
                                            required
                                            bind:value={podjetje.naslov}
                                    />
                                </div>
                                <div>
                                    <label for="podjetjeDavcna" class="label">OIB *</label>
                                    <input
                                            id="podjetjeDavcna"
                                            class="input"
                                            name="podjetjeDavcna"
                                            placeholder="HR12345678901"
                                            required
                                            bind:value={podjetje.davcna}
                                    />
                                </div>
                            </div>
                        </section>

                        <section class="card">
                            <h2 class="card-title text-[#0F786B]">Kotizacija</h2>
                            <div class="space-y-4 text-gray-800 text-base">
                                <div>
                                    <p class="font-semibold uppercase text-xs tracking-wider text-gray-500 mb-1">Individualna prijava</p>
                                    {#if jeAkcijskaCena}
                                        <p><span class="line-through text-gray-400">{formatirajCeno(rednaCenaIndividualna)} € + PDV po osobi</span></p>
                                        <p class="font-semibold text-[#0F786B]">Akcijska cijena za rane prijave: {formatirajCeno(akcijskaIndividualna)} € + PDV po osobi</p>
                                    {:else}
                                        <p>{formatirajCeno(rednaCenaIndividualna)} € + PDV po osobi</p>
                                    {/if}
                                </div>
                                <div>
                                    <p class="font-semibold uppercase text-xs tracking-wider text-gray-500 mb-1">Grupna prijava</p>
                                    {#if jeAkcijskaCena}
                                        <p><span class="line-through text-gray-400">{formatirajCeno(rednaCenaSkupinska)} € + PDV po osobi</span></p>
                                        <p class="font-semibold text-[#0F786B]">Akcijska cijena za rane prijave: {formatirajCeno(akcijskaSkupinska)} € + PDV po osobi</p>
                                    {:else}
                                        <p>{formatirajCeno(rednaCenaSkupinska)} € + PDV po osobi</p>
                                    {/if}
                                </div>
                            </div>
                        </section>

                        <section class="card">
                            <label for="prijavaVrsta" class="block text-lg font-semibold text-gray-800 mb-3">
                                Odaberite vrstu prijave *
                            </label>
                            <select
                                    id="prijavaVrsta"
                                    bind:value={prijavaVrsta}
                                    required
                                    class="input w-full md:w-1/2 lg:w-1/3"
                            >
                                <option value="" disabled>-- Odaberite --</option>
                                <option value="individualna">Individualna prijava</option>
                                <option value="skupinska">Grupna prijava (najmanje 4 osobe)</option>
                            </select>
                        </section>

                        {#if prijavaVrsta === 'individualna'}
                            <section class="card" transition:fade>
                                <h2 class="card-title text-[#0F786B]">Podaci sudionika</h2>
                                {#each udelezenci as ud, idx (idx)}
                                    <div class="space-y-4 mb-6">
                                        <input type="hidden" name="udelezenec{idx}_index" value={idx} />
                                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div>
                                                <label for="ud{idx}_ime" class="label">Ime i prezime *</label>
                                                <input
                                                        id="ud{idx}_ime"
                                                        class="input"
                                                        name="udelezenec{idx}_ime"
                                                        placeholder="Npr. Ivan Horvat"
                                                        required
                                                        bind:value={ud.ime}
                                                />
                                            </div>
                                            <div>
                                                <label for="ud{idx}_email" class="label">Email adresa *</label>
                                                <input
                                                        id="ud{idx}_email"
                                                        type="email"
                                                        class="input"
                                                        name="udelezenec{idx}_email"
                                                        placeholder="npr. ivan.horvat@email.com"
                                                        required
                                                        bind:value={ud.email}
                                                />
                                            </div>
                                            <div>
                                                <label for="ud{idx}_telefon" class="label">Broj telefona *</label>
                                                <input
                                                        id="ud{idx}_telefon"
                                                        type="tel"
                                                        class="input"
                                                        name="udelezenec{idx}_telefon"
                                                        placeholder="Npr. 091 123 4567"
                                                        required
                                                        bind:value={ud.telefon}
                                                />
                                            </div>
                                        </div>
                                        <div class="flex flex-col sm:flex-row sm:items-center gap-4 pt-4">
                                            <label class="checkbox-label">
                                                <input
                                                        id="ud{idx}_sfd"
                                                        name="udelezenec{idx}_sfd"
                                                        type="checkbox"
                                                        bind:checked={ud.sfd}
                                                        class="checkbox"
                                                />
                                                Član sam HLJK
                                            </label>
                                        </div>
                                    </div>
                                {/each}
                                <div class="price-section">
                                    {#if jeAkcijskaCena}
                                        <p class="price-text"><span class="line-through text-gray-500">Kotizacija: {formatirajCeno(rednaCenaIndividualna)} € + PDV po osobi</span></p>
                                        <p class="price-text font-semibold">Kotizacija: {formatirajCeno(akcijskaIndividualna)} € + PDV po osobi</p>
                                    {:else}
                                        <p class="price-text">Kotizacija: {formatirajCeno(rednaCenaIndividualna)} € + PDV po osobi</p>
                                    {/if}
                                </div>
                            </section>
                        {:else if prijavaVrsta === 'skupinska'}
                            <section class="card" transition:fade>
                                <h2 class="card-title text-[#0F786B]">Podaci sudionika (najmanje 4)</h2>
                                <div class="space-y-8">
                                    {#each udelezenci as ud, idx (idx)}
                                        <div class="participant-box">
                                            <input type="hidden" name="udelezenec{idx}_index" value={idx} />
                                            <p class="font-semibold text-gray-700 mb-4">Sudionik #{idx + 1}</p>
                                            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                                                <div>
                                                    <label for="ud{idx}_ime" class="sr-only">Ime i prezime</label>
                                                    <input
                                                            id="ud{idx}_ime"
                                                            class="input"
                                                            name="udelezenec{idx}_ime"
                                                            placeholder="Ime i prezime *"
                                                            required
                                                            bind:value={ud.ime}
                                                    />
                                                </div>
                                                <div>
                                                    <label for="ud{idx}_email" class="sr-only">Email adresa</label>
                                                    <input
                                                            id="ud{idx}_email"
                                                            type="email"
                                                            class="input"
                                                            name="udelezenec{idx}_email"
                                                            placeholder="Email adresa *"
                                                            required
                                                            bind:value={ud.email}
                                                    />
                                                </div>
                                                <div>
                                                    <label for="ud{idx}_telefon" class="sr-only">Broj telefona</label>
                                                    <input
                                                            id="ud{idx}_telefon"
                                                            type="tel"
                                                            class="input"
                                                            name="udelezenec{idx}_telefon"
                                                            placeholder="Broj telefona *"
                                                            required
                                                            bind:value={ud.telefon}
                                                    />
                                                </div>
                                            </div>
                                            <div class="flex flex-col sm:flex-row sm:items-center gap-4 text-gray-800">
                                                <label class="checkbox-label">
                                                    <input
                                                            id="ud{idx}_sfd"
                                                            name="udelezenec{idx}_sfd"
                                                            type="checkbox"
                                                            bind:checked={ud.sfd}
                                                            class="checkbox"
                                                    />
                                                    Član sam HLJK
                                                </label>
                                                {#if udelezenci.length > 4}
                                                    <button
                                                            type="button"
                                                            on:click={() => odstraniUdelezenec(idx)}
                                                            title="Ukloni sudionika #{idx + 1}"
                                                            class="remove-button"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                        Ukloni
                                                    </button>
                                                {/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                                <div class="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-gray-200">
                                    <button type="button" on:click={dodajUdelezenec} class="add-button">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                                        </svg>
                                        Dodaj sudionika
                                    </button>
                                    <div class="text-right">
                                        {#if jeAkcijskaCena}
                                            <p class="price-text mt-1"><span class="line-through text-gray-500">Kotizacija: {formatirajCeno(rednaCenaSkupinska)} € + PDV po osobi</span></p>
                                            <p class="price-text mt-1 font-semibold">Kotizacija: {formatirajCeno(akcijskaSkupinska)} € + PDV po osobi</p>
                                        {:else}
                                            <p class="price-text mt-1">Kotizacija: {formatirajCeno(rednaCenaSkupinska)} € + PDV po osobi</p>
                                        {/if}
                                    </div>
                                </div>
                            </section>
                        {/if}

                        {#if prijavaVrsta}
                            <div class="pre-submit-note">
                                <p class="font-semibold text-lg md:text-xl text-[#0F786B]">
                                    Nakon zaprimanja Vaše prijave, potvrdu i račun za uplatu kotizacije ćemo Vam poslati na Vašu e-mail adresu.
                                </p>
                            </div>
                        {/if}

                        {#if prijavaVrsta}
                            <div class="max-w-6xl mx-auto text-center mt-10 space-y-4">
                                <button
                                        type="button"
                                        on:click={triggerGDPRCheck}
                                        disabled={submitting}
                                        class="submit-button primary"
                                >
                                    {#if submitting}
                                        Slanje...
                                    {:else}
                                        PREDAJTE PRIJAVU
                                    {/if}
                                </button>
                                <p class="text-sm text-gray-500 max-w-2xl mx-auto">
                                    Obavještavamo Vas da je broj mjesta na događaju ograničen te ćemo u slučaju većeg broja prijava voditi računa o redoslijedu prijava.
                                </p>
                                <p class="font-semibold text-gray-700 text-lg">Veselimo se susretu s Vama!</p>
                                {#if formError}
                                    <p class="text-red-600 mt-4 font-semibold">{formError}</p>
                                {/if}
                            </div>
                        {/if}
                    </form>
                </div>
            {:else if activeTab === 'program'}
                <div class="tab-content-wrapper" transition:fade={{ duration: 300 }}>
                    <div class="card">
                        <h2 class="card-title text-[#0F786B]">Program</h2>
                        <div class="space-y-0 text-gray-800">

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5">07:50 – 08:30</span>
                                <p class="font-semibold text-gray-700">Registracija</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5">08:30</span>
                                <p class="font-semibold text-gray-700">Početak predavanja</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Microbiological Bridges: Collaboration for Progress</p>
                                    <p class="text-sm text-gray-500 mt-0.5">dr. sc. Dina Jug (Novartis) · Irena Sušanj Stipić (JGL) · asist. Matic Brvar, mag. mol. funkc. biol. (IMI) · dr. Aljaž Sočan, mag. farm., spec. (KCLJ / SFD) · Željka Vrbanic (Merck)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Establishment of clean rooms at the University Medical Centre Ljubljana</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Skender Zahirović, mag. farm. (bolnička ljekarna UKC Ljubljana)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Designing Multifunctional GMP Facilities for ATMP Manufacturing under Biosafety Constraints</p>
                                    <p class="text-sm text-gray-500 mt-0.5">izr. prof. dr. Mojca Benčina (Centar za tehnologije genske i stanične terapije, Kemijski institut)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <p class="text-gray-600 italic">Q&A</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100 bg-amber-50/50 rounded-lg px-2">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <p class="font-semibold text-amber-700">☕ Pauza za kavu</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">The invisible foundation of aseptic processing: How GMP C and D grade areas support A/B grade environments</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Ivica Živko, mag. admin. sanit. (JGL, Steril production Technology Expert)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Recovery Time (ISO 14644-3) vs. Clean-up Time (GMP Annex 1)</p>
                                    <p class="text-sm text-gray-500 mt-0.5">mag. Nataša Štirn (Slovenian Cleanroom Society)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Automated chemotherapy compounding - advantages and disadvantages</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Jure Dolenc, mag. farm. (bolnička ljekarna OI)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <p class="text-gray-600 italic">Q&A</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Panel: Regulatory Updates in Focus: Quality Systems, Documentation Practices, and Annex 11 Legal Requirements</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Martina Bencetić Marijanović, mag. ing. bioproc., univ. mag. pharm. (HALMED)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100 bg-green-50/50 rounded-lg px-2">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <p class="font-semibold text-green-700">🍽️ Ručak</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-[#0F786B] uppercase tracking-wider w-24 shrink-0 pt-0.5 font-bold">Radionice</span>
                                <div>
                                    <p class="font-medium text-gray-800">Best Practice applications for Material transfer</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Denis Streitt (Senior Global Technical Consultant, Ecolab Life Science)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">From expectations into practice — CCS Driven Disinfectant Format Selection</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Michel Dominguesa (Senior Global Technical Consultant, Ecolab Life Science)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100 bg-amber-50/50 rounded-lg px-2">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <p class="font-semibold text-amber-700">☕ Pauza za kavu</p>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-[#0F786B] uppercase tracking-wider w-24 shrink-0 pt-0.5 font-bold">Radionice</span>
                                <div>
                                    <p class="font-medium text-gray-800">How to use equipment for cleanroom cleaning</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Jürgen Lederer (PFENNIG Reinigungstechnik)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-b border-gray-100">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5"></span>
                                <div>
                                    <p class="font-medium text-gray-800">Potential savings through validated systems</p>
                                    <p class="text-sm text-gray-500 mt-0.5">Thomas Kühling & Dominik Zick (PFENNIG Reinigungstechnik)</p>
                                </div>
                            </div>

                            <div class="flex gap-4 py-3 border-t-2 border-[#0F786B]/20 mt-2">
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider w-24 shrink-0 pt-0.5">17:00</span>
                                <p class="font-semibold text-gray-700">Završetak</p>
                            </div>

                        </div>
                    </div>
                </div>
            {/if}
        {/key}


        <footer class="footer mt-auto">
            <div class="contact-box">
                <p class="font-semibold text-[#0F786B] text-lg mb-2">
                    Za dodatne informacije nas kontaktirajte:
                </p>
                <p class="text-gray-700">
                    Matea Krizmanić |
                    <a href="mailto:cleanroom@sanol-h.com" class="link">cleanroom@sanol-h.com</a> |
                    <a href="tel:+385995050265" class="link">+385 (0)99 5050 265</a>
                </p>
            </div>
            <div>
                <img
                        src="/logo-hljk.png"
                        alt="Logo HLJK"
                        class="mx-auto h-24"
                />
            </div>
        </footer>
    </div>
</div>

{#if showGDPRModal}
    <div class="modal-overlay" transition:fade={{ duration: 200 }}>
        <div
                class="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby="gdprModalTitle"
                in:fly={{ y: -20, duration: 300, delay: 100 }}
                out:fly={{ y: 20, duration: 200 }}
        >
            <h3 id="gdprModalTitle" class="modal-title">Obavijest o zaštiti osobnih podataka (GDPR)</h3>
            <div class="modal-body">
                <p>
                    Slanjem prijavnice Hrvatskom farmaceutskom društvu i Sanolu H dopuštam prikupljanje,
                    pohranu, obradu i korištenje mojih osobnih podataka za potrebe provedbe stručnog
                    seminara.
                </p>
                <p>Voditelji obrade osobnih podataka su:</p>
                <ul class="list-disc list-inside ml-4 my-2">
                    <li>
                        Hrvatska ljekarnička komora, Martićeva 27, 10 000 Zagreb, 2. kat (<a
                            href="hljk@hljk.hr"
                            class="link">hljk@hljk.hr</a
                    >)
                    </li>
                    <li>
                        Sanol H d.o.o., Franje Lučića 32, 10090 Zagreb, Hrvatska (<a
                            href="mailto:info@sanol-h.com"
                            class="link">info@sanol-h.com</a
                    >)
                    </li>
                </ul>
                <p>
                    Oba voditelja obrade dužna su postupati u skladu s odredbama Zakona o provedbi Opće uredbe o zaštiti podataka
                    i Opće uredbe EU o zaštiti podataka (GDPR).
                </p>
                <p>
                    U skladu s odredbama GDPR-a imate pravo na pristup, ispravak, brisanje ("pravo na zaborav"),
                    prenosivost, ograničenje obrade osobnih podataka i prigovor. Za ostvarivanje
                    tih prava možete se obratiti bilo kojem od navedenih voditelja obrade.
                </p>
            </div>
            <div class="modal-actions">
                <button type="button" class="button secondary" on:click={cancelGDPR} disabled={submitting}>
                    Natrag
                </button>
                <button
                        type="button"
                        class="button primary"
                        on:click={acceptGDPRAndSubmit}
                        disabled={submitting}
                >
                    {#if submitting}
                        Slanje...
                    {:else}
                        Prihvaćam i šaljem prijavu
                    {/if}
                </button>
            </div>
        </div>
    </div>
{/if}

{#if showSuccessModal}
    <div class="modal-overlay" transition:fade={{ duration: 200 }}>
        <div
                class="modal-content max-w-lg text-center"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="successModalTitle"
                in:fly={{ y: -20, duration: 300, delay: 100 }}
                out:fly={{ y: 20, duration: 200 }}
        >
            <div class="mb-5 text-[#0F786B]">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h3 id="successModalTitle" class="modal-title text-xl md:text-2xl text-center">
                Prijava uspješno poslana!
            </h3>
            <p class="text-gray-600 mb-8 text-center">
                Hvala na Vašoj prijavi. Na navedenu e-mail adresu uskoro ćemo Vam poslati potvrdu primitka prijave i račun za uplatu kotizacije.
            </p>
            <div class="mt-6 flex justify-center">
                <button type="button" class="button primary px-8 py-2.5" on:click={closeSuccessModal}>
                    Odlično!
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    :global(#gmpForm .font-serif) {
        font-family: 'Lora', serif;
    }

    .input {
        @apply block w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 placeholder-gray-400 bg-white shadow-sm outline-none focus:ring-2 focus:ring-[#7AB2AC] focus:border-[#0F786B] transition duration-150 ease-in-out;
    }
    .checkbox {
        @apply h-5 w-5 accent-[#0F786B] border-gray-300 rounded focus:ring-2 focus:ring-offset-1 focus:ring-[#7AB2AC] cursor-pointer align-middle;
    }
    .label {
        @apply block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5;
    }
    .checkbox-label {
        @apply inline-flex items-center gap-2 cursor-pointer;
    }
    .card {
        @apply bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100;
    }
    .card-title {
        @apply font-serif text-xl md:text-2xl font-semibold text-gray-800 mb-6 border-b border-gray-100 pb-3;
    }
    .participant-box {
        @apply border border-gray-200 rounded-xl p-5 relative bg-white shadow-sm;
    }
    .price-section {
        @apply mt-6 pt-6 border-t border-gray-200;
    }
    .price-text {
        @apply font-semibold text-lg text-[#0F786B];
    }
    .remove-button {
        @apply ml-auto mt-2 sm:mt-0 px-3 py-1.5 border border-red-400 rounded-lg text-sm text-red-500 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-400 transition-colors duration-200;
    }
    .add-button {
        @apply w-full sm:w-auto bg-[#0F786B] text-white px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#0c5f56] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7AB2AC] transition-all duration-200;
    }
    .pre-submit-note {
        @apply max-w-6xl mx-auto mt-10 text-center p-5 bg-[#0F786B]/5 border border-[#0F786B]/20 rounded-xl;
    }
    .submit-button {
        @apply px-10 py-3.5 rounded-xl shadow-lg transition-all duration-200 text-lg font-bold uppercase tracking-wide focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed;
    }
    .submit-button.primary {
        @apply bg-[#0F786B] text-white hover:bg-[#0c5f56] hover:shadow-xl focus:ring-[#7AB2AC];
    }
    .footer {
        @apply max-w-6xl mx-auto text-center pt-8 border-t border-gray-200;
    }
    .contact-box {
        @apply inline-block border-2 border-[#0F786B] px-8 py-5 mb-8 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200;
    }
    .link {
        @apply text-[#0F786B] hover:text-[#0c5f56] hover:underline transition-colors duration-200;
    }
    .tab-button {
        @apply px-6 py-3 font-semibold text-lg transition-colors duration-200 ease-in-out border-b-2;
    }
    .tab-button.active {
        @apply border-[#0F786B] text-[#0F786B];
    }
    .tab-button:not(.active) {
        @apply border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300;
    }
    .modal-overlay {
        @apply fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4;
    }
    .modal-content {
        @apply bg-white w-full max-w-2xl mx-auto p-7 rounded-2xl shadow-xl text-left transform transition-all scale-100 opacity-100;
    }
    .modal-title {
        @apply text-xl font-semibold text-gray-800 mb-4;
    }
    .modal-body {
        @apply text-sm text-gray-600 leading-relaxed max-h-60 overflow-y-auto pr-2 space-y-3;
    }
    .modal-actions {
        @apply mt-8 flex gap-4 justify-end border-t border-gray-100 pt-5;
    }
    .button {
        @apply px-5 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 font-semibold disabled:opacity-50 disabled:cursor-not-allowed;
    }
    .button.primary {
        @apply bg-[#0F786B] text-white hover:bg-[#0c5f56] focus:ring-[#7AB2AC];
    }
    .button.secondary {
        @apply bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-400;
    }
    .prose p {
        @apply mb-4;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
