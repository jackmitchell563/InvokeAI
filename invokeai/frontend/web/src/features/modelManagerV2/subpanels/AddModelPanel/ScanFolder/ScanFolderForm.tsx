import { Button, Flex, FormControl, FormErrorMessage, FormHelperText, FormLabel, Input } from '@invoke-ai/ui-library';
import { useAppDispatch, useAppSelector } from 'app/store/storeHooks';
import { createModelManagerSelector, setScanPath } from 'features/modelManagerV2/store/modelManagerV2Slice';
import type { ChangeEventHandler } from 'react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLazyScanFolderQuery } from 'services/api/endpoints/models';

import { ScanModelsResults } from './ScanFolderResults';

const selectScanPath = createModelManagerSelector((mm) => mm.scanPath);

export const ScanModelsForm = memo(() => {
  const scanPath = useAppSelector(selectScanPath);
  const dispatch = useAppDispatch();
  const [errorMessage, setErrorMessage] = useState('');
  const { t } = useTranslation();

  const [_scanFolder, { isLoading, data }] = useLazyScanFolderQuery();

  const scanFolder = useCallback(() => {
    _scanFolder({ scan_path: scanPath })
      .unwrap()
      .catch((error) => {
        if (error) {
          setErrorMessage(error.data.detail);
        }
      });
  }, [_scanFolder, scanPath]);

  const handleSetScanPath: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      dispatch(setScanPath(e.target.value));
      setErrorMessage('');
    },
    [dispatch]
  );

  const handleBrowseFolder = useCallback(async () => {
    try {
      // Check if the API is supported
      if (!window.showDirectoryPicker) {
        setErrorMessage('Your browser does not support the directory picker. Please enter the path manually.');
        return;
      }

      const dirHandle = await window.showDirectoryPicker();
      const path = dirHandle.name;
      
      // Update the path in the store
      dispatch(setScanPath(path));
      setErrorMessage('');

      // Trigger the scan
      _scanFolder({ scan_path: path })
        .unwrap()
        .catch((error) => {
          if (error) {
            setErrorMessage(error.data.detail);
          }
        });
    } catch (err) {
      // User cancelled or permission denied
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - no need to show error
        return;
      }
      setErrorMessage('Unable to access the selected folder. Please try again or enter the path manually.');
    }
  }, [dispatch, _scanFolder]);

  return (
    <Flex flexDir="column" height="100%" gap={3}>
      <FormControl isInvalid={!!errorMessage.length} w="full" orientation="vertical" flexShrink={0}>
        <FormLabel>{t('common.folder')}</FormLabel>
        <Flex gap={3} alignItems="center" w="full">
          <Input placeholder={t('modelManager.scanPlaceholder')} value={scanPath} onChange={handleSetScanPath} />
          <Button
            onClick={handleBrowseFolder}
            isDisabled={isLoading}
            size="sm"
            flexShrink={0}
          >
            {t('common.browse')}
          </Button>
          <Button
            onClick={scanFolder}
            isLoading={isLoading}
            isDisabled={scanPath === undefined || scanPath.length === 0}
            size="sm"
            flexShrink={0}
          >
            {t('modelManager.scanFolder')}
          </Button>
        </Flex>
        <FormHelperText>{t('modelManager.scanFolderHelper')}</FormHelperText>
        {!!errorMessage.length && <FormErrorMessage>{errorMessage}</FormErrorMessage>}
      </FormControl>
      {data && <ScanModelsResults results={data} />}
    </Flex>
  );
});

ScanModelsForm.displayName = 'ScanModelsForm';
