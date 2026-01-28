export function useMapControls(emit) {
  const handlePointSettingsCommand = (command) => {
    if (command === 'kml') {
      emit('show-kml-settings');
    } else if (command === 'point') {
      emit('show-point-settings');
    }
  };

  const openFileManage = () => {
    window.open('/admin/files', '_blank');
  };

  return {
    handlePointSettingsCommand,
    openFileManage,
  };
}
