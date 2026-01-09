import { createSignal, onMount } from 'solid-js';
import { dbService, AppSettings, DEFAULT_SETTINGS } from '../../services/dbService';
import { toast } from 'solid-toast';
import './Settings.scss';

export default function Settings() {
  const [logoUrl, setLogoUrl] = createSignal('');
  const [signatureName, setSignatureName] = createSignal('');
  const [signatureCRFa, setSignatureCRFa] = createSignal('');
  const [logoFile, setLogoFile] = createSignal<File | null>(null);
  const [logoPreview, setLogoPreview] = createSignal<string>('');

  onMount(async () => {
    const settings = await dbService.getSettings();
    setLogoUrl(settings.logoUrl);
    setSignatureName(settings.signatureName);
    setSignatureCRFa(settings.signatureCRFa);
    setLogoPreview(settings.logoUrl);
  });

  const handleLogoUpload = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecione uma imagem válida');
        return;
      }

      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    try {
      let finalLogoUrl = logoUrl();

      // If user uploaded a new logo, convert to base64
      if (logoFile()) {
        const reader = new FileReader();
        finalLogoUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoFile()!);
        });
      }

      const settings: AppSettings = {
        logoUrl: finalLogoUrl,
        signatureName: signatureName(),
        signatureCRFa: signatureCRFa()
      };

      await dbService.saveSettings(settings);
      setLogoUrl(finalLogoUrl);
      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erro ao salvar configurações');
    }
  };

  const handleReset = async () => {
    if (confirm('Deseja realmente restaurar as configurações padrão?')) {
      try {
        await dbService.saveSettings(DEFAULT_SETTINGS);
        setLogoUrl(DEFAULT_SETTINGS.logoUrl);
        setSignatureName(DEFAULT_SETTINGS.signatureName);
        setSignatureCRFa(DEFAULT_SETTINGS.signatureCRFa);
        setLogoPreview(DEFAULT_SETTINGS.logoUrl);
        setLogoFile(null);
        toast.success('Configurações restauradas!');
      } catch (error) {
        console.error('Error resetting settings:', error);
        toast.error('Erro ao restaurar configurações');
      }
    }
  };

  return (
    <div class="settings-page">
      <div class="settings-header">
        <h1>Configurações</h1>
        <p class="subtitle">Personalize os relatórios</p>
      </div>

      <div class="settings-container">
        <div class="settings-section">
          <h2>Logo</h2>
          <p class="section-description">
            Carregue um logo personalizado para aparecer nos relatórios impressos
          </p>
          
          <div class="logo-upload-area">
            <div class="logo-preview">
              {logoPreview() && (
                <img src={logoPreview()} alt="Logo preview" />
              )}
            </div>
            <div class="logo-upload-controls">
              <input
                type="file"
                id="logo-upload"
                accept="image/*"
                onChange={handleLogoUpload}
                style="display: none;"
              />
              <label for="logo-upload" class="btn btn-upload">
                📁 Escolher Logo
              </label>
              <p class="helper-text">
                Formatos aceitos: PNG, JPG, SVG<br/>
                Recomendado: fundo transparente
              </p>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h2>Assinatura</h2>
          <p class="section-description">
            Informações que aparecerão na assinatura dos relatórios
          </p>
          
          <div class="form-group">
            <label for="signature-name">Nome Completo</label>
            <input
              type="text"
              id="signature-name"
              value={signatureName()}
              onInput={(e) => setSignatureName(e.currentTarget.value)}
              placeholder="Ex: Ana Maria Carvalho de Oliveira"
            />
          </div>

          <div class="form-group">
            <label for="signature-crfa">Registro CRFa</label>
            <input
              type="text"
              id="signature-crfa"
              value={signatureCRFa()}
              onInput={(e) => setSignatureCRFa(e.currentTarget.value)}
              placeholder="Ex: CRFa2 - 12.876"
            />
          </div>
        </div>

        <div class="settings-actions">
          <button class="btn btn-reset" onClick={handleReset}>
            🔄 Restaurar Padrão
          </button>
          <button class="btn btn-save" onClick={handleSave}>
            💾 Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
}

