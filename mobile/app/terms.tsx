import { View, Text, ScrollView, Pressable } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/themeStore';

export default function TermsScreen() {
  const { mode } = useThemeStore();
  const isDark = mode === 'dark';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? '#141414' : '#F0F4F8' }} edges={['top']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 }}>
        <Pressable
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Ionicons name="arrow-back" size={20} color={isDark ? '#F9FAFB' : '#0F172A'} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: isDark ? '#F9FAFB' : '#0F172A' }}>
            Términos y Condiciones
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {/* Last Updated */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#64748B' }}>
            Última actualización: Junio 2026
          </Text>
        </View>

        {/* Introduction */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A', marginBottom: 12 }}>
            Bienvenido a Control Prenatal
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22 }}>
            Al usar nuestra aplicación, aceptas estos términos. Control Prenatal es una plataforma diseñada para facilitar la comunicación entre pacientes y profesionales de la salud, con un enfoque en el bienestar materno y neonatal.
          </Text>
        </View>

        {/* Non-Profit Nature */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8467C20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="heart" size={20} color="#E8467C" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
              Sin Fines de Lucro
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 12 }}>
            Control Prenatal es una iniciativa sin fines de lucro. No cobramos comisiones por las citas, no vendemos tus datos personales y no utilizamos tu información con propósitos comerciales.
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22 }}>
            Tu información de salud es utilizada únicamente para mejorar la calidad de atención médica y facilitar la comunicación con tus profesionales de la salud.
          </Text>
        </View>

        {/* Data Privacy */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F620', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="shield-checkmark" size={20} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
              Privacidad de Datos
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 12 }}>
            Tus datos médicos y personales son confidenciales. Implementamos medidas de seguridad para proteger tu información:
          </Text>
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • No compartimos tu información con terceros sin tu consentimiento explícito
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • Tus datos médicos solo son accesibles por ti y los profesionales de la salud que autorices
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • Utilizamos encriptación para proteger la transmisión de datos
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22 }}>
              • Puedes solicitar la eliminación de tus datos en cualquier momento
            </Text>
          </View>
        </View>

        {/* Medical Disclaimer */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="medical" size={20} color="#F59E0B" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
              Descargo Médico
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 12 }}>
            Control Prenatal es una plataforma de comunicación y gestión de citas, no reemplaza la atención médica profesional.
          </Text>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22 }}>
            En caso de emergencia médica, contacta inmediatamente a los servicios de emergencia locales. No utilices esta aplicación para situaciones que requieren atención médica inmediata.
          </Text>
        </View>

        {/* User Responsibilities */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="person" size={20} color="#10B981" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
              Responsabilidades del Usuario
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 12 }}>
            Como usuario de Control Prenatal, te comprometes a:
          </Text>
          <View style={{ marginLeft: 8 }}>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • Proporcionar información veraz y actualizada
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • Respetar a los profesionales de la salud y otros usuarios
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 8 }}>
              • Asistir a las citas programadas o cancelar con anticipación
            </Text>
            <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22 }}>
              • No utilizar la plataforma para fines fraudulentos o ilegales
            </Text>
          </View>
        </View>

        {/* Contact */}
        <View style={{ backgroundColor: isDark ? '#1C1C1C' : '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#8B5CF620', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Ionicons name="mail" size={20} color="#8B5CF6" />
            </View>
            <Text style={{ fontSize: 18, fontWeight: '700', color: isDark ? '#F9FAFB' : '#0F172A' }}>
              Contacto
            </Text>
          </View>
          <Text style={{ fontSize: 14, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 22, marginBottom: 12 }}>
            Si tienes preguntas sobre estos términos o necesitas asistencia, contáctanos:
          </Text>
          <Text style={{ fontSize: 14, color: '#E8467C', fontWeight: '600' }}>
            soporte@controlprenatal.com
          </Text>
        </View>

        {/* Agreement */}
        <View style={{ backgroundColor: isDark ? '#E8467C12' : '#FCE7F3', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: isDark ? '#E8467C40' : '#FBCFE8' }}>
          <Text style={{ fontSize: 14, color: isDark ? '#F9FAFB' : '#0F172A', fontWeight: '600', marginBottom: 8 }}>
            Al continuar usando Control Prenatal, aceptas estos términos y condiciones.
          </Text>
          <Text style={{ fontSize: 13, color: isDark ? '#D1D5DB' : '#374151', lineHeight: 20 }}>
            Estos términos pueden actualizarse periódicamente. Te notificaremos de cambios importantes.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
