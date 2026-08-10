import React from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    FlatList, 
    TouchableOpacity, 
    ActivityIndicator, 
    SafeAreaView 
} from 'react-native';
import { useWearableDevice } from '../hooks/useWearableDevice';
import { WearableDevice } from '../types/wearable';
import { 
    Watch, 
    Shield, 
    Circle, 
    Radio, 
    AlertTriangle, 
    RefreshCw, 
    Trash2 
} from 'lucide-react-native';

const getDeviceIcon = (deviceType: string, color: string = '#666', size: number = 24) => {
    switch (deviceType) {
        case 'SMARTWATCH': return <Watch color={color} size={size} />;
        case 'SMART_RING': return <Circle color={color} size={size} />;
        case 'PANIC_PENDANT': return <Shield color={color} size={size} />;
        case 'BLE_BUTTON': return <Radio color={color} size={size} />;
        default: return <Watch color={color} size={size} />;
    }
};

export function WearableScreen() {
    const {
        pairedDevices,
        scannedDevices,
        activeDevice,
        connectionStatus,
        isLoading,
        error,
        scanForDevices,
        pairDevice,
        triggerWearableSOS,
        disconnectDevice,
        telemetry,
    } = useWearableDevice();

    const renderScannedDevice = ({ item }: { item: WearableDevice }) => (
        <View style={styles.deviceCard}>
            <View style={styles.deviceInfo}>
                {getDeviceIcon(item.deviceType, '#4f46e5', 28)}
                <View style={styles.deviceTextContainer}>
                    <Text style={styles.deviceName}>{item.name}</Text>
                    <Text style={styles.deviceSubText}>
                        {item.deviceType.replace('_', ' ')} {item.macAddress ? `• ${item.macAddress}` : ''}
                    </Text>
                </View>
            </View>
            <TouchableOpacity 
                style={styles.actionButton} 
                onPress={() => pairDevice(item.id)}
                disabled={isLoading}
            >
                <Text style={styles.actionButtonText}>Pair</Text>
            </TouchableOpacity>
        </View>
    );

    const renderPairedDevice = (item: WearableDevice) => {
        const isActive = activeDevice?.id === item.id;
        
        return (
            <View key={item.id} style={[styles.deviceCard, isActive && styles.activeDeviceCard]}>
                <View style={styles.deviceInfo}>
                    {getDeviceIcon(item.deviceType, isActive ? '#10b981' : '#6b7280', 28)}
                    <View style={styles.deviceTextContainer}>
                        <Text style={styles.deviceName}>
                            {item.name} {isActive ? '(Active)' : ''}
                        </Text>
                        <Text style={styles.deviceSubText}>
                            Battery: {isActive ? (telemetry?.batteryLevel ?? item.batteryLevel) : item.batteryLevel}% • {isActive ? connectionStatus : 'DISCONNECTED'}
                        </Text>
                        {isActive && telemetry && (
                            <View style={styles.telemetryContainer}>
                                {telemetry.heartRate !== undefined && (
                                    <Text style={styles.telemetryText}>❤️ {telemetry.heartRate} bpm</Text>
                                )}
                                {telemetry.stepCount !== undefined && (
                                    <Text style={styles.telemetryText}>👟 {telemetry.stepCount} steps</Text>
                                )}
                                {telemetry.rssi !== undefined && (
                                    <Text style={styles.telemetryText}>📶 {telemetry.rssi} dBm</Text>
                                )}
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity 
                    style={styles.dangerButton} 
                    onPress={() => disconnectDevice(item.id)}
                    disabled={isLoading}
                >
                    <Trash2 color="#ef4444" size={20} />
                </TouchableOpacity>
            </View>
        );
    };

    const renderHeader = () => (
        <View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Wearable Devices</Text>
            </View>

            {error && (
                <View style={styles.errorBanner}>
                    <AlertTriangle color="#fff" size={20} />
                    <Text style={styles.errorText}>{error.message || 'An error occurred'}</Text>
                </View>
            )}

            <View style={styles.section}>
                <TouchableOpacity 
                    style={[styles.sosButton, (!activeDevice || isLoading) && styles.disabledButton]} 
                    onPress={() => triggerWearableSOS('MANUAL_BUTTON')}
                    disabled={!activeDevice || isLoading}
                >
                    <AlertTriangle color="#fff" size={28} style={styles.sosIcon} />
                    <Text style={styles.sosButtonText}>TRIGGER SOS</Text>
                </TouchableOpacity>
                {!activeDevice && (
                    <Text style={styles.helperText}>Connect a device to enable remote SOS</Text>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Paired Devices</Text>
                {pairedDevices.length > 0 ? (
                    pairedDevices.map(renderPairedDevice)
                ) : (
                    <Text style={styles.emptyText}>No paired devices</Text>
                )}
            </View>

            <View style={[styles.sectionHeader, { marginBottom: 16 }]}>
                <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Nearby Devices</Text>
                <TouchableOpacity 
                    onPress={scanForDevices} 
                    disabled={isLoading}
                    style={styles.scanButton}
                >
                    {isLoading ? (
                        <ActivityIndicator size="small" color="#4f46e5" />
                    ) : (
                        <RefreshCw color="#4f46e5" size={18} />
                    )}
                    <Text style={styles.scanButtonText}>Scan</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <FlatList
                data={scannedDevices}
                keyExtractor={(item) => item.id}
                renderItem={renderScannedDevice}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={<Text style={styles.emptyText}>No nearby devices found</Text>}
                contentContainerStyle={styles.scrollContent}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9fafb',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 20,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#111827',
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ef4444',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
    },
    errorText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
        fontSize: 14,
        flex: 1,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    sosButton: {
        flexDirection: 'row',
        backgroundColor: '#ef4444',
        paddingVertical: 16,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    sosIcon: {
        marginRight: 8,
    },
    sosButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    disabledButton: {
        backgroundColor: '#fca5a5',
        shadowOpacity: 0,
        elevation: 0,
    },
    helperText: {
        textAlign: 'center',
        color: '#6b7280',
        fontSize: 13,
        marginTop: 8,
    },
    scanButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    scanButtonText: {
        color: '#4f46e5',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 14,
    },
    deviceCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#f3f4f6',
    },
    activeDeviceCard: {
        borderColor: '#10b981',
        borderWidth: 2,
        backgroundColor: '#f0fdf4',
    },
    deviceInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    deviceTextContainer: {
        marginLeft: 12,
        flex: 1,
    },
    deviceName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    deviceSubText: {
        fontSize: 13,
        color: '#6b7280',
    },
    actionButton: {
        backgroundColor: '#4f46e5',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
    },
    dangerButton: {
        padding: 8,
        backgroundColor: '#fee2e2',
        borderRadius: 8,
    },
    emptyText: {
        textAlign: 'center',
        color: '#9ca3af',
        fontSize: 15,
        marginTop: 8,
        fontStyle: 'italic',
    },
    telemetryContainer: {
        flexDirection: 'row',
        marginTop: 6,
        gap: 12,
        flexWrap: 'wrap',
    },
    telemetryText: {
        fontSize: 12,
        color: '#4f46e5',
        fontWeight: '500',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        overflow: 'hidden',
    },
});