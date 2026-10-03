package com.ggbank.service;

import com.ggbank.model.Beneficiary;
import com.ggbank.repository.BeneficiaryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class BeneficiaryService {

    @Autowired
    private BeneficiaryRepository beneficiaryRepository;

    public Beneficiary addBeneficiary(String userId, Beneficiary ben) throws Exception {
        ben.setUserId(userId);
        ben.setCreatedAt(LocalDateTime.now().toString());
        return beneficiaryRepository.save(ben);
    }

    public List<Beneficiary> getBeneficiariesForUser(String userId) throws Exception {
        return beneficiaryRepository.findByUserId(userId);
    }

    public void removeBeneficiary(String beneficiaryId) throws Exception {
        beneficiaryRepository.deleteById(beneficiaryId);
    }
}
